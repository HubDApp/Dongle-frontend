# Rust Validation Fuzzing Requirements

## Issue Summary

The `validate_bounty_url` and `validate_bounty_cid` functions in `validation.rs` use string prefix and length checks that could have edge cases with malformed inputs. Fuzz tests should be added to ensure the validators correctly reject malformed inputs without panicking.

## Background

This document outlines requirements for the **Soroban smart contract backend** (Rust/Soroban contracts repository). The Dongle frontend repository does not contain Rust code, but this documentation serves as a specification for the backend team.

### Context

- **Frontend Repository**: Dongle-frontend (this repository) - Next.js/TypeScript
- **Backend Repository**: Soroban contracts (separate repository) - Rust/Soroban
- **Affected Module**: `validation.rs` in the Soroban contracts repository

The validation functions in question are likely used to validate bounty-related URLs and CIDs (Content Identifiers for IPFS) before storing them on-chain. These validators must be robust against:
- Malformed inputs
- Extremely long strings
- Special characters and Unicode edge cases
- Empty strings and null bytes
- Buffer overflow attempts
- Format string attacks

## Validation Functions to Test

Based on the issue description, the following functions need fuzz testing:

### 1. `validate_bounty_url`

**Purpose**: Validate that a bounty URL is properly formatted and safe to store.

**Expected Behavior**:
- Accept valid HTTP/HTTPS URLs
- Reject malformed URLs (missing protocol, invalid characters, etc.)
- Reject excessively long URLs (>2048 characters is a reasonable limit)
- Handle Unicode domains correctly
- Never panic on invalid input

**Current Implementation Issues**:
- Likely uses simple prefix checks (`starts_with("http")`)
- May not handle edge cases like:
  - `http://` (valid prefix but incomplete URL)
  - URLs with spaces: `http://example .com`
  - URLs with null bytes: `http://example.com\0malicious`
  - Extremely long URLs that could cause stack overflow
  - Non-ASCII characters in unexpected positions

### 2. `validate_bounty_cid`

**Purpose**: Validate that a CID (Content Identifier) follows the IPFS CID format.

**Expected Behavior**:
- Accept valid CIDv0 (base58, starting with `Qm`)
- Accept valid CIDv1 (multibase encoded)
- Reject invalid base58/base32 characters
- Reject incorrect length (CIDv0 should be 46 characters)
- Handle edge cases gracefully
- Never panic on invalid input

**Current Implementation Issues**:
- Likely uses length checks and prefix validation
- May not handle:
  - CIDs with mixed case (if using case-sensitive base58)
  - CIDs with lookalike characters (0/O, 1/I/l)
  - Truncated CIDs
  - Padded CIDs with extra characters
  - Unicode characters that look like base58 chars

## Fuzzing Strategy

### Recommended Tools

#### 1. **cargo-fuzz** (Recommended)
- **Website**: https://github.com/rust-fuzz/cargo-fuzz
- **Engine**: libFuzzer (LLVM's fuzzing engine)
- **Pros**: 
  - Easy integration with Cargo
  - Fast and efficient
  - Good coverage-guided fuzzing
  - Built-in corpus management
- **Installation**:
  ```bash
  cargo install cargo-fuzz
  ```

#### 2. **afl.rs** (Alternative)
- **Website**: https://github.com/rust-fuzz/afl.rs
- **Engine**: American Fuzzy Lop (AFL)
- **Pros**:
  - Battle-tested fuzzer
  - Excellent at finding edge cases
  - Good for complex input validation
- **Installation**:
  ```bash
  cargo install afl
  ```

#### 3. **honggfuzz-rs** (Alternative)
- **Website**: https://github.com/rust-fuzz/honggfuzz-rs
- **Engine**: Honggfuzz
- **Pros**:
  - Very fast
  - Good feedback-driven fuzzing
  - Works well with Rust
- **Installation**:
  ```bash
  cargo install honggfuzz
  ```

### Recommended Approach: cargo-fuzz

For Soroban contracts, **cargo-fuzz** is the recommended choice due to:
- Easy setup and integration
- Good performance
- Active maintenance
- Built-in sanitizers (catches panics, overflows, memory issues)

## Implementation Guide

### Step 1: Project Setup

Add fuzzing support to the Soroban contracts repository:

```bash
cd /path/to/soroban-contracts
cargo fuzz init
```

This creates a `fuzz/` directory with the following structure:

```
fuzz/
├── Cargo.toml
└── fuzz_targets/
    └── fuzz_target_1.rs
```

### Step 2: Create Fuzz Target for `validate_bounty_url`

Create `fuzz/fuzz_targets/fuzz_validate_bounty_url.rs`:

```rust
#![no_main]

use libfuzzer_sys::fuzz_target;
use your_contract_crate::validation::validate_bounty_url;

fuzz_target!(|data: &[u8]| {
    // Convert raw bytes to string (lossy to handle invalid UTF-8)
    let input = String::from_utf8_lossy(data);
    
    // The validator should never panic, regardless of input
    // We don't care about the return value, just that it doesn't crash
    let _ = validate_bounty_url(&input);
});
```

**What this tests**:
- Random byte sequences as URLs
- Invalid UTF-8 sequences
- Extremely long strings
- Null bytes and control characters
- Unicode edge cases

**Expected behavior**: The function should return `Ok` or `Err`, but NEVER panic.

### Step 3: Create Fuzz Target for `validate_bounty_cid`

Create `fuzz/fuzz_targets/fuzz_validate_bounty_cid.rs`:

```rust
#![no_main]

use libfuzzer_sys::fuzz_target;
use your_contract_crate::validation::validate_bounty_cid;

fuzz_target!(|data: &[u8]| {
    // Convert to string
    let input = String::from_utf8_lossy(data);
    
    // Validator should handle any input gracefully
    let _ = validate_bounty_cid(&input);
});
```

### Step 4: Structured Fuzzing (Advanced)

For more targeted fuzzing, use the `arbitrary` crate to generate structured inputs:

Add to `fuzz/Cargo.toml`:
```toml
[dependencies]
arbitrary = { version = "1", features = ["derive"] }
```

Create `fuzz/fuzz_targets/fuzz_validate_bounty_url_structured.rs`:

```rust
#![no_main]

use libfuzzer_sys::fuzz_target;
use arbitrary::Arbitrary;
use your_contract_crate::validation::validate_bounty_url;

#[derive(Arbitrary, Debug)]
struct FuzzUrl {
    protocol: String,
    domain: String,
    path: String,
    query: Option<String>,
}

impl FuzzUrl {
    fn to_url(&self) -> String {
        let mut url = format!("{}://{}{}", self.protocol, self.domain, self.path);
        if let Some(query) = &self.query {
            url.push('?');
            url.push_str(query);
        }
        url
    }
}

fuzz_target!(|fuzz_url: FuzzUrl| {
    let url = fuzz_url.to_url();
    let _ = validate_bounty_url(&url);
});
```

### Step 5: Running Fuzz Tests

```bash
# Fuzz validate_bounty_url for 60 seconds
cargo fuzz run fuzz_validate_bounty_url -- -max_total_time=60

# Fuzz validate_bounty_cid for 5 minutes
cargo fuzz run fuzz_validate_bounty_cid -- -max_total_time=300

# Run with multiple jobs (parallel fuzzing)
cargo fuzz run fuzz_validate_bounty_url -jobs=4

# Run until a crash is found (or manually stopped)
cargo fuzz run fuzz_validate_bounty_url
```

### Step 6: Reproducing Crashes

When cargo-fuzz finds a crash, it saves the input to `fuzz/artifacts/`:

```bash
# Reproduce a specific crash
cargo fuzz run fuzz_validate_bounty_url \
  fuzz/artifacts/fuzz_validate_bounty_url/crash-abc123

# Debug with RUST_BACKTRACE
RUST_BACKTRACE=1 cargo fuzz run fuzz_validate_bounty_url \
  fuzz/artifacts/fuzz_validate_bounty_url/crash-abc123
```

### Step 7: Minimize Crashing Inputs

```bash
# Minimize a crashing input to smallest reproducing case
cargo fuzz cmin fuzz_validate_bounty_url

# Tmin (minimize single artifact)
cargo fuzz tmin fuzz_validate_bounty_url \
  fuzz/artifacts/fuzz_validate_bounty_url/crash-abc123
```

## Expected Issues to Find

Based on typical validation vulnerabilities, fuzzing will likely discover:

### 1. Panic on Null Bytes
```rust
// Before fix:
let parts: Vec<&str> = url.split("://").collect();
let domain = parts[1]; // Panics if no "://" found

// After fix:
let parts: Vec<&str> = url.split("://").collect();
let domain = parts.get(1).ok_or(ValidationError::InvalidUrl)?;
```

### 2. Integer Overflow on Length Checks
```rust
// Before fix:
if url.len() > MAX_URL_LENGTH {
    return Err(ValidationError::UrlTooLong);
}

// After fix:
if url.len() > MAX_URL_LENGTH.min(usize::MAX) {
    return Err(ValidationError::UrlTooLong);
}
```

### 3. Slice Index Out of Bounds
```rust
// Before fix:
if cid[0..2] == "Qm" { ... } // Panics if cid.len() < 2

// After fix:
if cid.len() >= 2 && &cid[0..2] == "Qm" { ... }
```

### 4. Unwrap/Expect on User Input
```rust
// Before fix:
let decoded = base58::decode(cid).expect("valid base58");

// After fix:
let decoded = base58::decode(cid)
    .map_err(|_| ValidationError::InvalidCid)?;
```

### 5. UTF-8 Assumptions
```rust
// Before fix:
let chars: Vec<char> = cid.chars().collect();
let first_char = chars[0]; // Panics on empty string

// After fix:
let first_char = cid.chars().next()
    .ok_or(ValidationError::EmptyCid)?;
```

## Recommended Validation Improvements

### URL Validation

```rust
use url::Url; // Use the `url` crate

pub fn validate_bounty_url(url_str: &str) -> Result<(), ValidationError> {
    // Check length first (prevent DOS)
    const MAX_URL_LENGTH: usize = 2048;
    if url_str.len() > MAX_URL_LENGTH {
        return Err(ValidationError::UrlTooLong);
    }
    
    // Check for null bytes
    if url_str.contains('\0') {
        return Err(ValidationError::InvalidUrl);
    }
    
    // Parse with url crate (handles edge cases)
    let parsed = Url::parse(url_str)
        .map_err(|_| ValidationError::InvalidUrl)?;
    
    // Ensure HTTPS only (security)
    if parsed.scheme() != "https" {
        return Err(ValidationError::InsecureProtocol);
    }
    
    // Ensure host is present
    if parsed.host().is_none() {
        return Err(ValidationError::MissingHost);
    }
    
    Ok(())
}
```

### CID Validation

```rust
use cid::Cid; // Use the `cid` crate

pub fn validate_bounty_cid(cid_str: &str) -> Result<(), ValidationError> {
    // Check length (CIDv0 = 46 chars, CIDv1 variable but <100)
    const MAX_CID_LENGTH: usize = 100;
    if cid_str.is_empty() {
        return Err(ValidationError::EmptyCid);
    }
    if cid_str.len() > MAX_CID_LENGTH {
        return Err(ValidationError::CidTooLong);
    }
    
    // Check for null bytes
    if cid_str.contains('\0') {
        return Err(ValidationError::InvalidCid);
    }
    
    // Parse using cid crate (handles CIDv0 and CIDv1)
    let _cid = Cid::try_from(cid_str)
        .map_err(|_| ValidationError::InvalidCid)?;
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_cidv0() {
        let cid = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
        assert!(validate_bounty_cid(cid).is_ok());
    }

    #[test]
    fn test_empty_cid() {
        assert!(validate_bounty_cid("").is_err());
    }

    #[test]
    fn test_cid_with_null_byte() {
        let cid = "QmYwAPJz\0v5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
        assert!(validate_bounty_cid(cid).is_err());
    }

    #[test]
    fn test_truncated_cid() {
        assert!(validate_bounty_cid("Qm").is_err());
    }
}
```

## Testing Strategy

### 1. Unit Tests (Required)
- Test happy paths (valid URLs/CIDs)
- Test known invalid inputs
- Test edge cases (empty, null bytes, max length)

### 2. Property-Based Tests (Recommended)
Use `proptest` or `quickcheck`:

```rust
#[cfg(test)]
mod proptests {
    use proptest::prelude::*;
    use super::*;

    proptest! {
        #[test]
        fn validate_url_never_panics(s in "\\PC*") {
            // Should never panic on any string
            let _ = validate_bounty_url(&s);
        }

        #[test]
        fn validate_cid_never_panics(s in "\\PC*") {
            // Should never panic on any string
            let _ = validate_bounty_cid(&s);
        }
    }
}
```

### 3. Fuzz Tests (Required for Issue Resolution)
- Run cargo-fuzz for at least 24 hours per target
- Archive and commit any discovered crashes
- Fix all panics before production deployment

### 4. Integration Tests
- Test validators with real bounty submission flow
- Test with data from frontend (simulate actual user input)
- Test with malicious payloads from security checklist

## Security Checklist

Before marking this issue as complete, ensure:

- [ ] Validators never panic on any input
- [ ] Validators handle null bytes correctly
- [ ] Validators handle extremely long inputs (>1MB)
- [ ] Validators handle invalid UTF-8 sequences
- [ ] Validators have maximum length limits
- [ ] Validators use safe parsing libraries (url, cid)
- [ ] Validators do not use `.unwrap()` or `.expect()` on user input
- [ ] Validators do not use unchecked array indexing
- [ ] Validators are covered by unit tests
- [ ] Validators are covered by property-based tests
- [ ] Validators are covered by fuzz tests
- [ ] Fuzz tests run for minimum 24 hours without crashes
- [ ] All discovered crashes are fixed and regression tested
- [ ] Validation errors are properly propagated to frontend
- [ ] Error messages do not leak sensitive information

## CI/CD Integration

Add fuzzing to CI pipeline:

```yaml
# .github/workflows/fuzz.yml
name: Fuzz Tests

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
  workflow_dispatch:     # Manual trigger

jobs:
  fuzz:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        target: 
          - fuzz_validate_bounty_url
          - fuzz_validate_bounty_cid
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: nightly  # Fuzzing requires nightly
          override: true
      
      - name: Install cargo-fuzz
        run: cargo install cargo-fuzz
      
      - name: Run fuzz test
        run: |
          cargo fuzz run ${{ matrix.target }} -- \
            -max_total_time=600 \
            -timeout=5
        working-directory: ./contracts
      
      - name: Upload artifacts on failure
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: fuzz-artifacts-${{ matrix.target }}
          path: contracts/fuzz/artifacts/
```

## Resources

### Documentation
- **cargo-fuzz book**: https://rust-fuzz.github.io/book/cargo-fuzz.html
- **libFuzzer docs**: https://llvm.org/docs/LibFuzzer.html
- **Rust Fuzzing Authority**: https://github.com/rust-fuzz

### Libraries
- **url crate**: https://docs.rs/url/ (URL parsing)
- **cid crate**: https://docs.rs/cid/ (IPFS CID parsing)
- **arbitrary crate**: https://docs.rs/arbitrary/ (structured fuzzing)

### Security References
- **OWASP Input Validation**: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- **Rust Security Guidelines**: https://anssi-fr.github.io/rust-guide/

## Definition of Done

This issue can be marked as complete when:

1. ✅ Fuzz targets created for `validate_bounty_url` and `validate_bounty_cid`
2. ✅ Fuzz tests run for minimum 24 hours per target with no crashes
3. ✅ Any discovered issues are fixed
4. ✅ Regression tests added for discovered edge cases
5. ✅ Validators use safe parsing libraries (`url`, `cid` crates)
6. ✅ All validators have proper error handling (no panics)
7. ✅ Unit tests cover all edge cases
8. ✅ Property-based tests added using proptest/quickcheck
9. ✅ Fuzzing integrated into CI/CD pipeline
10. ✅ Security checklist completed
11. ✅ Documentation updated with validation requirements
12. ✅ Frontend updated to handle all validation error types

## Communication with Backend Team

**To**: Backend/Smart Contract Team  
**Re**: Rust Validation Fuzzing Requirements

This document outlines fuzzing requirements for `validate_bounty_url` and `validate_bounty_cid` in your Rust/Soroban contracts. The frontend team has identified this as a potential security issue.

**Action Items**:
1. Review this document
2. Set up fuzzing infrastructure in contracts repo
3. Create fuzz targets for both validators
4. Run fuzz tests for 24+ hours
5. Fix any discovered issues
6. Update frontend error handling based on new validation errors

**Timeline**: Please prioritize this work for the next sprint. Security issues should be addressed before the next production deployment.

**Questions**: Contact the frontend team or open an issue in this repository.

---

**Created**: Generated by Dongle Frontend Team  
**Status**: Requirements Document - Awaiting Backend Implementation  
**Priority**: High (Security)
