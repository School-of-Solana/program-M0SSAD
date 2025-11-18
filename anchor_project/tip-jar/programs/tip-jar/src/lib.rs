use crate::instructions::*;
use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod states;

declare_id!("75ozxYC9js6iFTQzwaz5SAKXGa9prCvyHqY1UZzDiDun");

#[program]
pub mod tip_jar {
    use super::*;

    pub fn create_creator_profile(
        ctx: Context<CreateCreatorProfile>,
        name: String,
        bio: String,
    ) -> Result<()> {
        instructions::create_creator_profile::handler(ctx, name, bio)
    }

    pub fn send_tip(ctx: Context<SendTip>, amount: u64, message: String) -> Result<()> {
        instructions::send_tip::handler(ctx, amount, message)
    }

    pub fn withdraw_tips(ctx: Context<WithdrawTips>, amount: u64) -> Result<()> {
        instructions::withdraw_tips::handler(ctx, amount)
    }

    pub fn update_profile(ctx: Context<UpdateProfile>, name: String, bio: String) -> Result<()> {
        instructions::update_profile::handler(ctx, name, bio)
    }
}
