package com.dongle.api;

import com.dongle.api.models.SubmissionData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class DongleClientTest {

    private DongleClient client;

    @BeforeEach
    void setUp() {
        client = new DongleClient.Builder()
            .baseUrl("https://api.test.com")
            .apiKey("test-key")
            .build();
    }

    @Test
    void testBuilderCreatesClient() {
        assertNotNull(client);
    }

    @Test
    void testBuilderRequiresBaseUrl() {
        assertThrows(IllegalArgumentException.class, () -> {
            new DongleClient.Builder().build();
        });
    }

    @Test
    void testBuilderSetsDefaultTimeout() {
        DongleClient client = new DongleClient.Builder()
            .baseUrl("https://api.test.com")
            .build();

        assertNotNull(client);
    }

    @Test
    void testSubmissionDataBuilder() {
        SubmissionData data = new SubmissionData.Builder()
            .projectName("Test Project")
            .category("defi")
            .description("Test description")
            .websiteUrl("https://example.com")
            .build();

        assertEquals("Test Project", data.getProjectName());
        assertEquals("defi", data.getCategory());
        assertEquals("Test description", data.getDescription());
        assertEquals("https://example.com", data.getWebsiteUrl());
    }
}
