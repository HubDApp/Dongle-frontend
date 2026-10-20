# Dongle API - Python SDK

Official Python SDK for the Dongle Form API.

## Installation

```bash
pip install dongle-api
```

## Quick Start

```python
from dongle_api import FormApiClient

# Initialize client
client = FormApiClient(
    base_url='https://api.dongle.example.com',
    api_key='your-api-key'  # Optional
)

# Create a submission
result = client.create_submission({
    'projectName': 'My Project',
    'category': 'defi',
    'description': 'A DeFi project on Stellar',
    'websiteUrl': 'https://example.com'
})

if result['success']:
    print('Submission created:', result['data'])
else:
    print('Error:', result['error'])
```

## API Reference

See full documentation at: https://docs.dongle.example.com
