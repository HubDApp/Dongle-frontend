/**
 * Example: Using the Batch Submissions API
 */

import type { BatchSubmissionRequest, BatchSubmissionResponse } from '@/types/batch';

// Example 1: Individual Mode (each item processed independently)
async function submitIndividualBatch() {
  const request: BatchSubmissionRequest = {
    mode: 'individual',
    items: [
      {
        id: 'project-1',
        data: {
          name: 'DeFi Protocol Alpha',
          category: 'DeFi',
          description: 'Decentralized lending platform',
          website: 'https://example.com',
        },
      },
      {
        id: 'project-2',
        data: {
          name: 'NFT Marketplace Beta',
          category: 'NFT',
          description: 'NFT trading platform',
          website: 'https://example2.com',
        },
      },
      {
        id: 'project-3',
        data: {
          name: 'Gaming Platform Gamma',
          category: 'Gaming',
          description: 'Blockchain gaming ecosystem',
          website: 'https://example3.com',
        },
      },
    ],
  };

  try {
    const response = await fetch('/api/batch/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    const result = await response.json();

    if (result.success) {
      const data: BatchSubmissionResponse = result.data;
      console.log(`✓ Processed ${data.successCount}/${data.results.length} items`);

      // Handle individual failures
      data.results.forEach((item) => {
        if (item.success) {
          console.log(`✓ ${item.id}: Success`);
        } else {
          console.error(`✗ ${item.id}: ${item.error?.message}`);
        }
      });
    }
  } catch (error) {
    console.error('Batch submission failed:', error);
  }
}

// Example 2: Atomic Mode (all or nothing)
async function submitAtomicBatch() {
  const request: BatchSubmissionRequest = {
    mode: 'atomic',
    items: [
      { id: 'item-1', data: { name: 'Project A', category: 'DeFi' } },
      { id: 'item-2', data: { name: 'Project B', category: 'NFT' } },
    ],
  };

  try {
    const response = await fetch('/api/batch/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (response.ok) {
      console.log('✓ All items processed successfully');
    } else {
      const error = await response.json();
      console.error('✗ Batch failed:', error.error.message);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Example 3: Large Batch with Chunking
async function submitLargeBatch(items: Array<{ id: string; data: any }>) {
  const CHUNK_SIZE = 50;
  const chunks: typeof items[] = [];

  // Split into chunks
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    chunks.push(items.slice(i, i + CHUNK_SIZE));
  }

  console.log(`Processing ${items.length} items in ${chunks.length} chunks...`);

  const results = await Promise.all(
    chunks.map(async (chunk, index) => {
      const request: BatchSubmissionRequest = {
        mode: 'individual',
        items: chunk,
      };

      const response = await fetch('/api/batch/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const result = await response.json();
      console.log(`Chunk ${index + 1}/${chunks.length}: ${result.data.successCount} succeeded`);

      return result.data;
    })
  );

  const totalSuccess = results.reduce((sum, r) => sum + r.successCount, 0);
  const totalFailure = results.reduce((sum, r) => sum + r.failureCount, 0);

  console.log(`\nTotal: ${totalSuccess} succeeded, ${totalFailure} failed`);
}

// Example 4: With Error Handling and Retry
async function submitWithRetry(items: BatchSubmissionRequest['items']) {
  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const response = await fetch('/api/batch/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'individual', items }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      const data: BatchSubmissionResponse = result.data;

      // Retry only failed items
      const failedItems = items.filter((item) => {
        const resultItem = data.results.find((r) => r.id === item.id);
        return resultItem && !resultItem.success;
      });

      if (failedItems.length === 0) {
        console.log('✓ All items processed successfully');
        return;
      }

      console.log(`Retrying ${failedItems.length} failed items...`);
      items = failedItems;
      attempt++;

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      attempt++;

      if (attempt >= MAX_RETRIES) {
        throw new Error('Max retries exceeded');
      }
    }
  }
}

// Example 5: Progress Tracking
async function submitWithProgress(items: BatchSubmissionRequest['items']) {
  let completed = 0;
  const total = items.length;

  const updateProgress = (current: number) => {
    const percent = Math.round((current / total) * 100);
    console.log(`Progress: ${percent}% (${current}/${total})`);
  };

  const request: BatchSubmissionRequest = {
    mode: 'individual',
    items,
  };

  const response = await fetch('/api/batch/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const result = await response.json();
  const data: BatchSubmissionResponse = result.data;

  // Update progress based on results
  data.results.forEach((item, index) => {
    completed++;
    if ((completed % 10 === 0) || completed === total) {
      updateProgress(completed);
    }
  });

  return data;
}

export {
  submitIndividualBatch,
  submitAtomicBatch,
  submitLargeBatch,
  submitWithRetry,
  submitWithProgress,
};
