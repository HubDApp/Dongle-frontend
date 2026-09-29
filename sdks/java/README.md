# Dongle API - Java SDK

Official Java SDK for the Dongle Form API.

## Installation

**Maven:**
```xml
<dependency>
    <groupId>com.dongle</groupId>
    <artifactId>dongle-api</artifactId>
    <version>1.0.0</version>
</dependency>
```

## Quick Start

```java
import com.dongle.api.DongleClient;

DongleClient client = new DongleClient.Builder()
    .baseUrl("https://api.dongle.example.com")
    .apiKey("your-api-key")
    .build();

// Use the client...
```

## License

MIT
