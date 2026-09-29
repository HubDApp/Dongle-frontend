# Dongle API - Go SDK

Official Go SDK for the Dongle Form API.

## Installation

```bash
go get github.com/dongle/go-sdk
```

## Quick Start

```go
package main

import (
    "fmt"
    "github.com/dongle/go-sdk/dongle"
)

func main() {
    client := dongle.NewClient(&dongle.Config{
        BaseURL: "https://api.dongle.example.com",
        APIKey:  "your-api-key",
    })

    result, err := client.CreateSubmission(&dongle.SubmissionData{
        ProjectName: "My Project",
        Category:    "defi",
        Description: "A DeFi project",
    })

    if err != nil {
        panic(err)
    }

    fmt.Printf("Submission created: %+v\n", result.Data)
}
```

## License

MIT
