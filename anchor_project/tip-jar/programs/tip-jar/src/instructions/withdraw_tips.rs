use crate::errors::ErrorCode;
use crate::states::*;
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<WithdrawTips>, amount: u64) -> Result<()> {
    let creator_wallet = &mut ctx.accounts.authority;
    let creator_account_data = &mut ctx.accounts.creator_account;
    let withdrawal_record = &mut ctx.accounts.withdrawal_record;
    let clock = Clock::get()?;

    require!(amount > 0, ErrorCode::InvalidWithdrawalAmount);

    // Check if the creator has enough tips to withdraw.
    require!(
        creator_account_data.tips_balance >= amount,
        ErrorCode::InsufficientTipsBalance
    );

    // let seeds = &[
    //     b"creator",
    //     creator_wallet.key.as_ref(),
    //     &[creator_account_data.bump],
    // ];
    // let signer_seeds = &[&seeds[..]];

    // let cpi_context = CpiContext::new_with_signer(
    //     ctx.accounts.system_program.to_account_info(),
    //     anchor_lang::system_program::Transfer {
    //         from: creator_account_data.to_account_info(), // from Creator PDA
    //         to: creator_wallet.to_account_info(),         // To Creator's wallet
    //     },
    //     signer_seeds,
    // );
    // anchor_lang::system_program::transfer(cpi_context, amount)?;

    **creator_account_data
        .to_account_info()
        .try_borrow_mut_lamports()? -= amount;
    **creator_wallet.to_account_info().try_borrow_mut_lamports()? += amount;

    // Update the creator's tips balance after successful withdrawal.
    creator_account_data.tips_balance = creator_account_data
        .tips_balance
        .checked_sub(amount)
        .ok_or(ErrorCode::Overflow)?;

    creator_account_data.last_withdrawal = clock.unix_timestamp;
    creator_account_data.withdrawal_count = creator_account_data
        .withdrawal_count
        .checked_add(1)
        .ok_or(ErrorCode::Overflow)?;

    withdrawal_record.creator = creator_account_data.key();
    withdrawal_record.amount = amount;
    withdrawal_record.timestamp = clock.unix_timestamp; // Use Solana's clock for accurate timestamp
    withdrawal_record.bump = ctx.bumps.withdrawal_record;

    Ok(())
}

#[derive(Accounts)]
#[instruction(amount: u64)] // Input the amount to be withdrawn, and timestamp of the withdrawal.
pub struct WithdrawTips<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"creator", authority.key().as_ref()],
        bump = creator_account.bump,
        //has_one = authority @ ErrorCode::Unauthorized,
    )]
    pub creator_account: Account<'info, Creator>,

    #[account(
        init,
        payer = authority,
        space = Withdrawal::space(),
        seeds = [
            b"withdrawal",
            authority.key().as_ref(),
            &creator_account.withdrawal_count.to_le_bytes()
        ],
        bump
    )]
    pub withdrawal_record: Account<'info, Withdrawal>,

    pub system_program: Program<'info, System>,
}
