# Dongle API - Ruby SDK

Official Ruby SDK for the Dongle Form API.

## Installation

```bash
gem install dongle-api
```

## Quick Start

```ruby
require 'dongle'

client = Dongle::Client.new(
  base_url: 'https://api.dongle.example.com',
  api_key: 'your-api-key'
)

result = client.create_submission(
  project_name: 'My Project',
  category: 'defi',
  description: 'A DeFi project'
)

puts result[:data]
```

## License

MIT
