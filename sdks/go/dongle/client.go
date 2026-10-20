// Package dongle provides a Go client for the Dongle Form API
package dongle

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Config holds the client configuration
type Config struct {
	BaseURL string
	APIKey  string
	Timeout time.Duration
}

// Client is the main API client
type Client struct {
	config     *Config
	httpClient *http.Client
}

// APIError represents an API error response
type APIError struct {
	StatusCode int
	Code       string
	Message    string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("API error %d: %s", e.StatusCode, e.Message)
}

// APIResponse represents a standard API response
type APIResponse struct {
	Success bool                   `json:"success"`
	Data    interface{}            `json:"data,omitempty"`
	Error   string                 `json:"error,omitempty"`
	Meta    map[string]interface{} `json:"meta,omitempty"`
}

// SubmissionData represents submission input
type SubmissionData struct {
	ProjectName string `json:"projectName"`
	Category    string `json:"category"`
	Description string `json:"description"`
	WebsiteURL  string `json:"websiteUrl,omitempty"`
	GithubURL   string `json:"githubUrl,omitempty"`
	LogoURL     string `json:"logoUrl,omitempty"`
	DocsURL     string `json:"docsUrl,omitempty"`
}

// ReviewData represents review input
type ReviewData struct {
	ProjectID string `json:"projectId"`
	Rating    int    `json:"rating"`
	Comment   string `json:"comment"`
}

// NewClient creates a new API client
func NewClient(config *Config) *Client {
	if config.Timeout == 0 {
		config.Timeout = 30 * time.Second
	}

	return &Client{
		config: config,
		httpClient: &http.Client{
			Timeout: config.Timeout,
		},
	}
}

func (c *Client) request(method, endpoint string, body interface{}) (*APIResponse, error) {
	url := c.config.BaseURL + endpoint

	var reqBody io.Reader
	if body != nil {
		jsonData, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reqBody = bytes.NewBuffer(jsonData)
	}

	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	if c.config.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.config.APIKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var apiResp APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, err
	}

	if !apiResp.Success {
		return nil, &APIError{
			StatusCode: resp.StatusCode,
			Message:    apiResp.Error,
		}
	}

	return &apiResp, nil
}

// CreateSubmission creates a new submission
func (c *Client) CreateSubmission(data *SubmissionData) (*APIResponse, error) {
	return c.request("POST", "/api/submissions", data)
}

// GetSubmissions retrieves submissions
func (c *Client) GetSubmissions() (*APIResponse, error) {
	return c.request("GET", "/api/submissions", nil)
}

// CreateReview creates a new review
func (c *Client) CreateReview(data *ReviewData) (*APIResponse, error) {
	return c.request("POST", "/api/reviews", data)
}

// GetReviews retrieves reviews
func (c *Client) GetReviews() (*APIResponse, error) {
	return c.request("GET", "/api/reviews", nil)
}
