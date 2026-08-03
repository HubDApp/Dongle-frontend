# Offline Detection & Network Status Guide

## Overview

The offline detection system monitors network connectivity and prevents users from attempting network-dependent actions while offline. It provides visual feedback and graceful degradation when the connection is lost.

## Features

✅ Real-time online/offline detection  
✅ Visual banner notifications (top/bottom)  
✅ Toast notifications on status change  
✅ Network action guards  
✅ Automatic recovery detection  
✅ Optional periodic connectivity checks  
✅ Retry logic with exponential backoff  

## Components

### 1. useOnlineStatus Hook
Core hook that monitors connectivity using multiple methods:
- Browser `navigator.onLine` API
- `online`/`offline` event listeners
- Optional periodic HTTP ping checks

### 2. OfflineBanner Component
Visual banner that appears when offline:
- Top or bottom positioning
- Auto-dismisses when back online
- Compact mode available

### 3. OnlineStatusProvider
React Context provider that wraps the app and provides status to all components.

### 4. Network Guard Utilities
Helper functions to block or retry network-dependent actions.

## Setup

### 1. Wrap Your App

Add the provider to your root layout:

```tsx
// app/layout.tsx
import { OnlineStatusProvider } from '@/components/providers/OnlineStatusProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <OnlineStatusProvider
          showBanner={true}
          showToast={true}
          checkInterval={30000} // Optional: check every 30s
          pingUrl="/api/health" // Optional: endpoint to ping
        >
          {children}
        </OnlineStatusProvider>
      </body>
    </html>
  );
}
```

### 2. Use in Components

```tsx
import { useOnlineStatusContext } from '@/components/providers/OnlineStatusProvider';
import { OfflineWarning } from '@/components/ui/OfflineBanner';

function MyComponent() {
  const { isOnline } = useOnlineStatusContext();

  if (!isOnline) {
    return <OfflineWarning message="Cannot submit review while offline" />;
  }

  return <ReviewForm />;
}
```

## Usage Examples

### Basic Status Check

```tsx
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

function Example() {
  const { isOnline } = useOnlineStatus();

  return (
    <div>
      Status: {isOnline ? '🟢 Online' : '🔴 Offline'}
    </div>
  );
}
```

### With Callbacks

```tsx
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { toast } from 'sonner';

function Example() {
  const { isOnline } = useOnlineStatus({
    onOnline: () => {
      toast.success('Connection restored!');
      // Refetch data, resume operations, etc.
    },
    onOffline: () => {
      toast.error('You are offline');
      // Cancel pending requests, show cached data, etc.
    },
  });

  return <div>...</div>;
}
```

### Guard Network Actions

```tsx
import { useOnlineStatusContext } from '@/components/providers/OnlineStatusProvider';
import { NETWORK_ACTIONS, shouldBlockAction } from '@/lib/network-guard';
import { toast } from 'sonner';

function WalletConnect() {
  const { isOnline } = useOnlineStatusContext();

  const handleConnect = async () => {
    const { blocked, reason } = shouldBlockAction(
      isOnline,
      NETWORK_ACTIONS.WALLET_CONNECT
    );

    if (blocked) {
      toast.error(reason);
      return;
    }

    // Proceed with wallet connection
    await connectWallet();
  };

  return (
    <button
      onClick={handleConnect}
      disabled={!isOnline}
    >
      Connect Wallet
    </button>
  );
}
```

### Disable Buttons When Offline

```tsx
import { useOnlineStatusContext } from '@/components/providers/OnlineStatusProvider';

function ActionButton() {
  const { isOnline } = useOnlineStatusContext();

  return (
    <button
      disabled={!isOnline}
      className={!isOnline ? 'opacity-50 cursor-not-allowed' : ''}
      title={!isOnline ? 'Requires internet connection' : ''}
    >
      Submit Transaction
    </button>
  );
}
```

### Show Inline Warnings

```tsx
import { useOnlineStatusContext } from '@/components/providers/OnlineStatusProvider';
import { OfflineWarning } from '@/components/ui/OfflineBanner';

function Form() {
  const { isOnline } = useOnlineStatusContext();

  return (
    <div>
      {!isOnline && (
        <OfflineWarning message="Form submission requires internet connection" />
      )}
      
      <form>
        {/* form fields */}
        <button type="submit" disabled={!isOnline}>
          Submit
        </button>
      </form>
    </div>
  );
}
```

### Retry Failed Requests

```tsx
import { retryWithBackoff, isNetworkError } from '@/lib/network-guard';

async function fetchData() {
  try {
    const data = await retryWithBackoff(
      () => fetch('/api/data').then(r => r.json()),
      {
        maxRetries: 3,
        initialDelay: 1000,
        backoffMultiplier: 2,
      }
    );
    return data;
  } catch (error) {
    if (isNetworkError(error)) {
      toast.error('Network error. Please check your connection.');
    } else {
      toast.error('An error occurred');
    }
  }
}
```

### Periodic Connectivity Checks

```tsx
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

function App() {
  const { isOnline, lastCheck, checkConnectivity } = useOnlineStatus({
    checkInterval: 30000, // Check every 30 seconds
    pingUrl: 'https://www.cloudflare.com/cdn-cgi/trace',
  });

  return (
    <div>
      <div>Status: {isOnline ? 'Online' : 'Offline'}</div>
      {lastCheck && (
        <div>Last checked: {lastCheck.toLocaleTimeString()}</div>
      )}
      <button onClick={checkConnectivity}>
        Check Now
      </button>
    </div>
  );
}
```

## Network-Dependent Actions

The following actions are automatically guarded:

| Action | Requires Network | Fallback Behavior |
|--------|-----------------|-------------------|
| Wallet Connection | ✅ Yes | Show error, disable button |
| Transaction Submission | ✅ Yes | Show error, disable button |
| Project Submission | ✅ Yes | Show warning, save draft |
| Review Submission | ✅ Yes | Show warning, save draft |
| Verification Request | ✅ Yes | Show error, disable button |
| Browse Projects | ❌ No | Show cached data |
| View Project Details | ❌ No | Show cached data |
| Read Reviews | ❌ No | Show cached data |

## Testing

### Manual Testing

1. **Open DevTools**
   - Press F12 or Cmd+Option+I

2. **Simulate Offline**
   - Go to Network tab
   - Change throttling to "Offline"

3. **Test Actions**
   - Try wallet connection (should be blocked)
   - Try form submission (should show warning)
   - Try navigation (should work with cached data)

4. **Go Back Online**
   - Set throttling back to "Online"
   - Verify recovery banner appears
   - Verify actions are re-enabled

### Automated Testing

```tsx
import { render, screen } from '@testing-library/react';
import { act } from 'react';

test('shows offline banner when offline', () => {
  // Mock navigator.onLine
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: false,
  });

  render(<App />);

  expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
});

test('enables actions when online', () => {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true,
  });

  render(<WalletConnect />);

  const button = screen.getByRole('button', { name: /connect/i });
  expect(button).not.toBeDisabled();
});
```

## Best Practices

### 1. Always Check Before Network Operations

```tsx
// ❌ Bad
const handleSubmit = async () => {
  await submitForm(data);
};

// ✅ Good
const handleSubmit = async () => {
  if (!isOnline) {
    toast.error('Cannot submit while offline');
    return;
  }
  await submitForm(data);
};
```

### 2. Provide Visual Feedback

```tsx
// Show disabled state
<button
  disabled={!isOnline}
  className={!isOnline ? 'opacity-50' : ''}
>
  {!isOnline ? '🔴' : '🟢'} Submit
</button>
```

### 3. Handle Errors Gracefully

```tsx
try {
  await networkOperation();
} catch (error) {
  if (isNetworkError(error)) {
    toast.error('Network error. Please check your connection.');
  } else {
    toast.error('Operation failed');
  }
}
```

### 4. Save Drafts Before Network Operations

```tsx
const handleSubmit = async () => {
  // Save draft locally
  localStorage.setItem('draft', JSON.stringify(formData));

  if (!isOnline) {
    toast.info('Draft saved. Submit when back online.');
    return;
  }

  await submitForm(formData);
  localStorage.removeItem('draft');
};
```

### 5. Cache Data for Offline Use

```tsx
// Cache responses
const fetchData = async () => {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    
    // Cache for offline use
    localStorage.setItem('cachedData', JSON.stringify(data));
    
    return data;
  } catch (error) {
    // Return cached data when offline
    if (isNetworkError(error)) {
      const cached = localStorage.getItem('cachedData');
      if (cached) return JSON.parse(cached);
    }
    throw error;
  }
};
```

## Integration Checklist

- [x] Install and configure OnlineStatusProvider
- [ ] Add offline detection to wallet operations
- [ ] Disable transaction buttons when offline
- [ ] Add warnings to form submissions
- [ ] Implement draft saving for offline scenarios
- [ ] Cache project and review data
- [ ] Test with DevTools offline mode
- [ ] Add retry logic to API calls
- [ ] Handle network errors in all fetch calls
- [ ] Update documentation for users

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| navigator.onLine | ✅ | ✅ | ✅ | ✅ |
| online/offline events | ✅ | ✅ | ✅ | ✅ |
| Fetch API | ✅ | ✅ | ✅ | ✅ |

## Limitations

1. **navigator.onLine is not always accurate**
   - May report "online" even with no internet
   - Use periodic checks for critical operations

2. **Offline detection is best-effort**
   - Can't detect degraded connections
   - Can't detect firewall/proxy issues

3. **No background sync**
   - Offline changes aren't automatically synced
   - Consider implementing a sync queue

## Next Steps

1. Add to all network-dependent components
2. Implement offline data caching
3. Add background sync for form submissions
4. Create offline-first experience for browsing
5. Monitor real-world offline scenarios
