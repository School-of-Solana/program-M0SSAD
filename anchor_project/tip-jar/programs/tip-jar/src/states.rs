use anchor_lang::prelude::*;

// definining to be used in both validation and account size calculation.
pub const MAX_NAME_LEN: usize = 32; // Maximum length for a name string
pub const MAX_BIO_LEN: usize = 200; // Maximum length for a bio string
pub const MAX_MESSAGE_LEN: usize = 140; // Maximum length for a message string

#[account]
pub struct Creator {
    pub authority: Pubkey,     // The wallet address of the creator
    pub name: String,          // The name of the creator
    pub bio: String,           // Short Bio of the creator
    pub total_tips: u64,       // Total amount of tips received
    pub tip_count: u64,        // Number of tips received
    pub withdrawal_count: u64, // 8 bytes - number of withdrawals made
    pub tips_balance: u64,     // Current balance of tips available for withdrawal
    pub created_at: i64,       // Timestamp of profile creation
    pub last_withdrawal: i64,  // Timestamp of last withdrawal
    pub bump: u8,              // Bump for PDA
}

impl Creator {
    pub fn space() -> usize {
        8 + // Discriminator
        32 + // authority Pubkey
        4 + MAX_NAME_LEN + // name String
        4 + MAX_BIO_LEN + // bio String
        8 + // total_tips u64
        8 + // tip_count u64
        8 + // tips_balance u64
        8 + // withdrawal_count u64
        8 + // created_at i64
        8 + // last_withdrawal i64
        1 // bump u8
    } // Total size of the Creator account = 329 bytes
}

#[account]
pub struct Tip {
    pub creator: Pubkey, // 32 bytes - who received the tip
    pub tipper: Pubkey,  // 32 bytes - who sent the tip
    pub amount: u64,     // 8 bytes - tip amount in lamports
    pub message: String, // 4 + MAX_MESSAGE_LEN bytes - optional message
    pub timestamp: i64,  // 8 bytes - when tip was sent
    pub bump: u8,        // 1 byte - PDA bump seed
}

impl Tip {
    pub fn space() -> usize {
        8  // discriminator
        + 32                  // creator
        + 32                  // tipper
        + 8                   // amount
        + 4 + MAX_MESSAGE_LEN // message
        + 8                   // timestamp
        + 1 // bump
    } // Total size of the Tip account = 233 bytes
}

#[account]
pub struct Withdrawal {
    pub creator: Pubkey, // 32 bytes - who is withdrawing
    pub amount: u64,     // 8 bytes - amount withdrawn
    pub timestamp: i64,  // 8 bytes - when withdrawal was made
    pub bump: u8,        // 1 byte - PDA bump seed
}

impl Withdrawal {
    pub fn space() -> usize {
        8  // discriminator
        + 32                  // creator
        + 8                   // amount
        + 8                   // timestamp
        + 1 // bump
    } // Total size of the Withdrawal account = 57 bytes
}
