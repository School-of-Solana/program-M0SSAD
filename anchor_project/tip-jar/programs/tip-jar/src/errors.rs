use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Creator name is too long (max 32 characters)")]
    NameTooLong,

    #[msg("Creator bio is too long (max 200 characters)")]
    BioTooLong,

    #[msg("Tip message is too long (max 140 characters)")]
    MessageTooLong,

    #[msg("Tip amount must be greater than zero")]
    InvalidTipAmount,

    #[msg("Only the creator can perform this action")]
    Unauthorized,

    #[msg("Unauthorized access - only the creator can update this profile")]
    UnauthorizedAccess,

    #[msg("Creator name cannot be empty")]
    NameEmpty,

    #[msg("Arithmetic overflow occurred")]
    Overflow,

    #[msg("Insufficient tips to perform this withdrawal")]
    InsufficientTipsBalance,

    #[msg("Invalid Withdrawal Amount")]
    InvalidWithdrawalAmount,

    #[msg("You cannot tip yourself.")]
    CannotTipSelf,
}
