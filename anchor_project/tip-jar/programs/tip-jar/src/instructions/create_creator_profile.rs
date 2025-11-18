use crate::errors::ErrorCode;
use crate::states::*;
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<CreateCreatorProfile>, name: String, bio: String) -> Result<()> {
    require!(name.len() <= MAX_NAME_LEN, ErrorCode::NameTooLong);

    require!(!name.is_empty(), ErrorCode::NameEmpty);

    require!(bio.len() <= MAX_BIO_LEN, ErrorCode::BioTooLong);

    let creator = &mut ctx.accounts.creator;
    let clock = Clock::get()?;

    creator.authority = ctx.accounts.authority.key();
    creator.name = name;
    creator.bio = bio;
    creator.total_tips = 0;
    creator.tip_count = 0;
    creator.withdrawal_count = 0;
    creator.tips_balance = 0;
    creator.created_at = clock.unix_timestamp;
    creator.last_withdrawal = 0;
    creator.bump = ctx.bumps.creator;

    Ok(())
}

#[derive(Accounts)]
#[instruction(name: String, bio: String)]
pub struct CreateCreatorProfile<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = Creator::space(),
        seeds = [b"creator", authority.key().as_ref()],
        bump
    )]
    pub creator: Account<'info, Creator>,

    pub system_program: Program<'info, System>,
}
