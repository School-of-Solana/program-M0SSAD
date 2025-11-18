use crate::errors::ErrorCode;
use crate::states::*;
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<SendTip>, amount: u64, message: String) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidTipAmount);

    require!(message.len() <= MAX_MESSAGE_LEN, ErrorCode::MessageTooLong);

    let tipper = &mut ctx.accounts.tipper;
    let creator = &mut ctx.accounts.creator;
    let tip = &mut ctx.accounts.tip;
    let clock = Clock::get()?;

    // Transfer lamports from tipper to creator
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        anchor_lang::system_program::Transfer {
            from: tipper.to_account_info(),
            to: creator.to_account_info(),
        },
    );
    anchor_lang::system_program::transfer(cpi_context, amount)?;

    // Initialize the Tip account
    tip.creator = creator.key();
    tip.tipper = tipper.key();
    tip.amount = amount;
    tip.message = message;
    tip.timestamp = clock.unix_timestamp; // Using Solana's clock for accurate timestamp
    tip.bump = ctx.bumps.tip;

    // Update creator's total tips and tip count
    creator.total_tips = creator
        .total_tips
        .checked_add(amount)
        .ok_or(ErrorCode::Overflow)?;
    creator.tip_count = creator
        .tip_count
        .checked_add(1)
        .ok_or(ErrorCode::Overflow)?;
    creator.tips_balance = creator
        .tips_balance
        .checked_add(amount)
        .ok_or(ErrorCode::Overflow)?;

    Ok(())
}

#[derive(Accounts)]
#[instruction(amount: u64, message: String)]
pub struct SendTip<'info> {
    #[account(mut)]
    pub tipper: Signer<'info>,

    #[account(
        mut,
        seeds = [b"creator", creator.authority.as_ref()],
        bump = creator.bump,
        constraint = tipper.key() != creator.authority @ ErrorCode::CannotTipSelf
    )]
    pub creator: Account<'info, Creator>,

    #[account(
        init,
        payer = tipper,
        space = Tip::space(),
        seeds = [
            b"tip",
            creator.key().as_ref(),
            tipper.key().as_ref(),
            &creator.tip_count.to_le_bytes()
        ],
        bump
    )]
    pub tip: Account<'info, Tip>,

    pub system_program: Program<'info, System>,
}
