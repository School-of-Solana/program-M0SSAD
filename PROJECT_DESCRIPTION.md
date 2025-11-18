# Project Description

**Deployed Frontend URL:** https://program-mossad.vercel.app/
**Solana Program ID:** 75ozxYC9js6iFTQzwaz5SAKXGa9prCvyHqY1UZzDiDun

## Project Overview

### Description
A decentralized tipping platform built on Solana that enables content creators to receive tips directly from their supporters. Creators register profiles with their name and bio, and anyone can send SOL tips with optional messages. All tips are recorded on-chain for transparency. Creators can withdraw their accumulated tips (partially or fully) at any time. This dApp demonstrates real-world token transfers, PDA usage, and account management on Solana.

### Key Features
- **Creator Registration**: Content creators can register profiles with custom names and bios
- **Send Tips**: Supporters can send SOL tips to any registered creator with optional messages
- **Tip History**: All tips are recorded on-chain with tipper, amount, message, and timestamp
- **Flexible Withdrawals**: Creators can withdraw specific amounts from their accumulated balance
- **Withdrawal Tracking**: The system tracks withdrawal history and balances
- **Profile Management**: Creators can update their profile information
- **Public Transparency**: Anyone can view creator profiles and tip history

### How to Use the dApp

1. **Connect Wallet** - Connect your Solana wallet (Phantom, Solflare, etc.)
2. **Register as Creator** (For creators):
   - Click "Create Profile"
   - Enter your display name and bio
   - Confirm transaction to create your creator account
3. **Send a Tip** (For supporters):
   - Browse registered creators
   - Select a creator
   - Enter tip amount (in SOL) and optional message
   - Confirm transaction to send tip
4. **Withdraw Tips** (For creators):
   - View your accumulated tips balance
   - Click "Withdraw Tips"
   - Enter the amount to withdraw
   - Confirm transaction to transfer tips to your wallet
5. **Update Profile** (For creators):
   - Click "Edit Profile"
   - Update name or bio
   - Confirm transaction to save changes

## Program Architecture

The Tip Jar program uses a multi-account architecture. Creator profiles store basic information, balances, and statistics. Individual Tip accounts record each tipping transaction, and Withdrawal accounts track payouts. The program handles SOL transfers between users and creator accounts, with creators maintaining control over their accumulated tips.

### PDA Usage

The program uses Program Derived Addresses to create deterministic accounts for creators, tips, and withdrawals.

**PDAs Used:**
- **Creator PDA**: Derived from seeds `["creator", creator_authority]`
  - Purpose: Unique profile account for each creator
  - Ensures one profile per wallet address
  - Holds accumulated tips until withdrawal

- **Tip PDA**: Derived from seeds `["tip", creator_pubkey, tipper_pubkey, timestamp_bytes]`
  - Purpose: Record each individual tip transaction
  - Prevents PDA collisions using timestamp
  - Enables querying tip history per creator

- **Withdrawal PDA**: Derived from seeds `["withdrawal", creator_pubkey, withdrawal_count_bytes]`
  - Purpose: Record each withdrawal transaction
  - Tracks history of payouts to the creator

### Program Instructions

**Instructions Implemented:**

1. **create_creator_profile**: Initializes a new creator account
   - Stores creator's name and bio
   - Initializes counters (total_tips, tip_count, withdrawal_count) to 0
   - Only callable once per wallet

2. **send_tip**: Transfers SOL from tipper to creator
   - Validates tip amount > 0
   - Transfers SOL using CPI to system program
   - Creates Tip account recording transaction details
   - Updates creator's `total_tips`, `tip_count`, and `tips_balance`

3. **withdraw_tips**: Transfers accumulated tips to creator
   - Verifies caller is creator authority
   - Accepts an `amount` parameter for partial withdrawals
   - Checks sufficient `tips_balance`
   - Transfers SOL from creator PDA to creator wallet
   - Updates `tips_balance`, `withdrawal_count`, and `last_withdrawal` timestamp
   - Creates a Withdrawal record

4. **update_profile**: Updates creator name and/or bio
   - Verifies caller is creator authority
   - Updates profile information
   - Maintains tip history and statistics

### Account Structure

```rust
#[account]
pub struct Creator {
    pub authority: Pubkey,      // Creator's wallet (32 bytes)
    pub name: String,           // Display name (4 + 32 bytes)
    pub bio: String,            // Short bio (4 + 200 bytes)
    pub total_tips: u64,        // Total SOL received lifetime (8 bytes)
    pub tip_count: u64,         // Number of tips received (8 bytes)
    pub withdrawal_count: u64,  // Number of withdrawals made (8 bytes)
    pub tips_balance: u64,      // Current available balance (8 bytes)
    pub created_at: i64,        // Unix timestamp (8 bytes)
    pub last_withdrawal: i64,   // Timestamp of last withdrawal (8 bytes)
    pub bump: u8,               // PDA bump seed (1 byte)
}

#[account]
pub struct Tip {
    pub creator: Pubkey,      // Recipient creator (32 bytes)
    pub tipper: Pubkey,       // Sender wallet (32 bytes)
    pub amount: u64,          // Tip amount in lamports (8 bytes)
    pub message: String,      // Optional message (4 + 140 bytes)
    pub timestamp: i64,       // Unix timestamp (8 bytes)
    pub bump: u8,             // PDA bump seed (1 byte)
}

#[account]
pub struct Withdrawal {
    pub creator: Pubkey,      // The creator who withdrew (32 bytes)
    pub amount: u64,          // Amount withdrawn (8 bytes)
    pub timestamp: i64,       // When it happened (8 bytes)
    pub bump: u8,             // PDA bump seed (1 byte)
}
```
## Testing

### Test Coverage

The test suite covers all core functionality with both successful operations and error scenarios to ensure robust program behavior.

**Happy Path Tests:**
- **test_create_creator_profile**: Successfully creates a creator account with valid name and bio
- **test_send_tip**: Successfully sends a tip from supporter to creator with message
- **test_withdraw_tips**: Creator successfully withdraws accumulated tips
- **test_update_profile**: Creator successfully updates their profile information
- **test_multiple_tips**: Multiple users can tip the same creator
- **test_tip_history**: All tips are recorded and queryable at line "320" in the tip-jar.ts

**Unhappy Path Tests:**
- **test_duplicate_creator**: Attempting to create profile twice with same wallet fails
- **test_send_zero_tip**: Sending 0 SOL tip is rejected
- **test_unauthorized_withdraw**: Non-creator cannot withdraw tips
- **test_unauthorized_update**: Non-creator cannot update profile
- **test_insufficient_balance**: Tipping more than wallet balance fails
- **test_invalid_creator**: Sending tip to non-existent creator fails

### Running Tests

```bash
# Install dependencies
npm install

# Run all tests
anchor test

# Run tests with detailed logs
anchor test -- --features "test-bpf"

# Run specific test file
anchor test tests/tip-jar.ts
```
## Additional Notes for Evaluators

### Technical Highlights
- **Implements proper SOL transfers** using CPI to system program
- **Uses PDAs correctly** with appropriate seeds to prevent collisions
- **Handles account rent exemption** properly
- **Implements proper error handling** with custom error codes
- **Efficient account structure** minimizing storage costs

### Design Decisions
- **Counts in Tip PDA seeds** ensures unique tip records even for rapid successive tips
- **Creator account holds tips** until withdrawal for gas efficiency (batch withdrawals)
- **Message field limited to 140 characters**  to control account size
- **Both tipper and recipient addresses stored** for full transparency

### Future Enhancements
- **Leaderboard** for top creators and tippers
- **Tip goals and milestones** for creators
- **Optional tip anonymity** feature
- **Integration** with creator content platforms
- **Tip scheduling/recurring tips**