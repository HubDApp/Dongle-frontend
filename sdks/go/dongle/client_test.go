package dongle

import (
	"testing"
)

func TestNewClient(t *testing.T) {
	config := &Config{
		BaseURL: "https://api.test.com",
		APIKey:  "test-key",
	}

	client := NewClient(config)

	if client == nil {
		t.Fatal("Expected client to be initialized")
	}

	if client.config.BaseURL != "https://api.test.com" {
		t.Errorf("Expected baseURL to be https://api.test.com, got %s", client.config.BaseURL)
	}

	if client.config.APIKey != "test-key" {
		t.Errorf("Expected apiKey to be test-key, got %s", client.config.APIKey)
	}
}

func TestNewClientDefaultTimeout(t *testing.T) {
	config := &Config{
		BaseURL: "https://api.test.com",
	}

	client := NewClient(config)

	if client.config.Timeout == 0 {
		t.Error("Expected timeout to be set to default value")
	}
}

func TestBuildQueryString(t *testing.T) {
	params := &QueryParams{
		Page:      1,
		Limit:     20,
		Status:    "approved",
		SortBy:    "createdAt",
		SortOrder: "desc",
	}

	query := buildQueryString(params)

	if query == "" {
		t.Error("Expected query string to be built")
	}

	// Check if all parameters are included
	expectedParams := []string{"page=1", "limit=20", "status=approved", "sortBy=createdAt", "sortOrder=desc"}
	for _, param := range expectedParams {
		if !contains(query, param) {
			t.Errorf("Expected query string to contain %s", param)
		}
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && (s[:len(substr)] == substr || s[len(s)-len(substr):] == substr || containsInMiddle(s, substr)))
}

func containsInMiddle(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
