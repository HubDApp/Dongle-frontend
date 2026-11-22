'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface PollingConfig {
  initialInterval?: number
  maxInterval?: number
  backoffMultiplier?: number
  maxRetries?: number
  stopOnStatuses?: string[]
  enabled?: boolean
}

export interface PollingResult<T> {
  data: T | null
  error: Error | null
  isPolling: boolean
  currentInterval: number
  retryCount: number
  poll: () => Promise<void>
  stop: () => void
  restart: () => void
}

const DEFAULT_CONFIG: Required<PollingConfig> = {
  initialInterval: 2000,
  maxInterval: 10000,
  backoffMultiplier: 2,
  maxRetries: 5,
  stopOnStatuses: ['confirmed', 'conversion_failed', 'staking_failed'],
  enabled: true,
}

export function usePolling<T>(
  pollFn: () => Promise<{ data: T; status: string }>,
  config: PollingConfig = {},
): PollingResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [currentInterval, setCurrentInterval] = useState(
    config.initialInterval ?? DEFAULT_CONFIG.initialInterval,
  )
  const [retryCount, setRetryCount] = useState(0)

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(false)
  const isPollingRef = useRef(false)
  const retryCountRef = useRef(0)
  const requestIdRef = useRef(0)
  const inFlightRequestRef = useRef<number | null>(null)

  const configRef = useRef<Required<PollingConfig>>({
    ...DEFAULT_CONFIG,
    ...config,
  })
  const pollFnRef = useRef(pollFn)
  const executePollRef = useRef<(manual?: boolean) => Promise<void>>(
    async () => undefined,
  )

  // Keep the latest inputs available to scheduled polls without restarting
  // the polling cycle whenever a caller passes a new object/function identity.
  useEffect(() => {
    configRef.current = { ...DEFAULT_CONFIG, ...config }
  }, [
    config.initialInterval,
    config.maxInterval,
    config.backoffMultiplier,
    config.maxRetries,
    config.stopOnStatuses,
    config.enabled,
  ])

  useEffect(() => {
    pollFnRef.current = pollFn
  }, [pollFn])

  const clearPendingTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    isPollingRef.current = false
    requestIdRef.current += 1
    inFlightRequestRef.current = null
    clearPendingTimeout()

    if (isMountedRef.current) {
      setIsPolling(false)
    }
  }, [clearPendingTimeout])

  const scheduleNextPoll = useCallback(
    (interval: number) => {
      clearPendingTimeout()

      if (!isMountedRef.current || !isPollingRef.current) {
        return
      }

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null
        void executePollRef.current()
      }, interval)
    },
    [clearPendingTimeout],
  )

  const executePoll = useCallback(
    async (manual = false) => {
      if (!isMountedRef.current || (!manual && !isPollingRef.current)) {
        return
      }

      // A manual poll should not create overlapping requests with a scheduled
      // poll. The request ID also prevents stale responses after stop/restart.
      if (inFlightRequestRef.current !== null) {
        return
      }

      const requestId = ++requestIdRef.current
      inFlightRequestRef.current = requestId

      try {
        const result = await pollFnRef.current()

        if (
          !isMountedRef.current ||
          requestIdRef.current !== requestId ||
          (!manual && !isPollingRef.current)
        ) {
          return
        }

        setData(result.data)
        setError(null)
        retryCountRef.current = 0
        setRetryCount(0)

        const initialInterval = configRef.current.initialInterval
        setCurrentInterval(initialInterval)

        if (configRef.current.stopOnStatuses.includes(result.status)) {
          stop()
          return
        }

        if (isPollingRef.current) {
          scheduleNextPoll(initialInterval)
        }
      } catch (caughtError) {
        if (
          !isMountedRef.current ||
          requestIdRef.current !== requestId ||
          (!manual && !isPollingRef.current)
        ) {
          return
        }

        const nextError =
          caughtError instanceof Error
            ? caughtError
            : new Error('Polling failed')

        setError(nextError)

        const nextRetryCount = retryCountRef.current + 1
        retryCountRef.current = nextRetryCount
        setRetryCount(nextRetryCount)

        if (nextRetryCount >= configRef.current.maxRetries) {
          stop()
          return
        }

        const nextInterval = Math.min(
          configRef.current.initialInterval *
            Math.pow(configRef.current.backoffMultiplier, nextRetryCount),
          configRef.current.maxInterval,
        )

        setCurrentInterval(nextInterval)

        if (isPollingRef.current) {
          scheduleNextPoll(nextInterval)
        }
      } finally {
        if (inFlightRequestRef.current === requestId) {
          inFlightRequestRef.current = null
        }
      }
    },
    [scheduleNextPoll, stop],
  )

  useEffect(() => {
    executePollRef.current = executePoll
  }, [executePoll])

  const start = useCallback(() => {
    if (
      isPollingRef.current ||
      !configRef.current.enabled ||
      !isMountedRef.current
    ) {
      return
    }

    isPollingRef.current = true
    setIsPolling(true)
    void executePoll()
  }, [executePoll])

  const poll = useCallback(async () => {
    await executePoll(true)
  }, [executePoll])

  const restart = useCallback(() => {
    clearPendingTimeout()
    requestIdRef.current += 1
    inFlightRequestRef.current = null
    isPollingRef.current = false

    if (!isMountedRef.current) {
      return
    }

    retryCountRef.current = 0
    setData(null)
    setError(null)
    setRetryCount(0)
    setCurrentInterval(configRef.current.initialInterval)
    setIsPolling(true)

    isPollingRef.current = true
    void executePoll()
  }, [clearPendingTimeout, executePoll])

  // This effect intentionally precedes the auto-start effect. React Strict
  // Mode replays effects in development, so setup must restore the mounted
  // flag before polling is started again.
  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      isPollingRef.current = false
      requestIdRef.current += 1
      inFlightRequestRef.current = null
      clearPendingTimeout()
    }
  }, [clearPendingTimeout])

  useEffect(() => {
    if (configRef.current.enabled) {
      start()
    } else {
      stop()
    }
  }, [start, stop, config.enabled])

  return {
    data,
    error,
    isPolling,
    currentInterval,
    retryCount,
    poll,
    stop,
    restart,
  }
}
