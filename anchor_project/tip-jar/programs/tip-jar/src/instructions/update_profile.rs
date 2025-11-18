use crate::errors::ErrorCode;
use crate::states::*;
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<UpdateProfile>, name: String, bio: String) -> Result<()> {
    require!(!name.is_empty(), ErrorCode::NameEmpty);

    require!(name.len() <= MAX_NAME_LEN, ErrorCode::NameTooLong);

    require!(bio.len() <= MAX_BIO_LEN, ErrorCode::BioTooLong);

    let creator = &mut ctx.accounts.creator;

    // Update the creator's profile information
    creator.name = name;
    creator.bio = bio;

    msg!("Profile updated for creator: {}", creator.authority);
    msg!("New name: {}, New bio: {}", creator.name, creator.bio);

    Ok(())
}

#[derive(Accounts)]
#[instruction(name: String, bio: String)]
pub struct UpdateProfile<'info> {
    /// The creator who owns the profile (must sign to update)
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"creator", authority.key().as_ref()],
        bump = creator.bump,
        has_one = authority @ ErrorCode::UnauthorizedAccess,
    )]
    pub creator: Account<'info, Creator>,
}
