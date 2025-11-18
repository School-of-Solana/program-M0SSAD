import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TipJar } from "../target/types/tip_jar";
import { expect } from "chai";

describe("Tip Jar Program", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.TipJar as Program<TipJar>;

  it("Program loads correctly", () => {
    console.log("Program ID:", program.programId.toString());
    expect(program.programId).to.not.be.null;
  });

  describe("Provider Setup", () => {
    it("Should have a valid provider", () => {
      expect(provider).to.not.be.null;
      expect(provider.connection).to.not.be.null;
      expect(provider.wallet).to.not.be.null;
    });

  it("Should have sufficient SOL for testing", async () => {
      const balance = await provider.connection.getBalance(provider.wallet.publicKey);
      expect(balance).to.be.greaterThan(0);
      console.log(`Test wallet balance: ${balance / anchor.web3.LAMPORTS_PER_SOL} SOL`);
    });
  });

  describe("Create Creator Profile", () => {
    it("Should create a creator profile successfully", async () => {
      const creator = anchor.web3.Keypair.generate();
      const name = "Test Creator";
      const bio = "This is a test bio for our creator";

      const [creatorPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("creator"), creator.publicKey.toBuffer()],
        program.programId
      );
      // Airdrop SOL to creator for rent
      await airdrop(provider.connection, creator.publicKey);
      // This calls lib.rs::create_creator_profile which calls handler!
      await program.methods
        .createCreatorProfile(name, bio)
        .accounts({
          authority: creator.publicKey,
          creator: creatorPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      const creatorAccount = await program.account.creator.fetch(creatorPda);
      
      expect(creatorAccount.name).to.equal(name);
      expect(creatorAccount.bio).to.equal(bio);
      expect(creatorAccount.authority.toBase58()).to.equal(creator.publicKey.toBase58());
      expect(creatorAccount.totalTips.toNumber()).to.equal(0);
      expect(creatorAccount.tipCount.toNumber()).to.equal(0);
      expect(creatorAccount.createdAt.toNumber()).to.be.greaterThan(0);
      expect(creatorAccount.bump).to.be.greaterThan(0);
    });

    it("Should fail when trying to create duplicate profile", async () => {
      const creator = anchor.web3.Keypair.generate();
      const name = "Duplicate Creator";
      const bio = "First profile";

      const [creatorPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("creator"), creator.publicKey.toBuffer()],
        program.programId
      );

      // Airdrop SOL to creator for rent
      await airdrop(provider.connection, creator.publicKey);
      // Create first profile successfully
      await program.methods
        .createCreatorProfile(name, bio)
        .accounts({
          authority: creator.publicKey,
          creator: creatorPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Try to create second profile - should fail
      try {
        await program.methods
          .createCreatorProfile("Second Profile", "This should fail")
          .accounts({
            authority: creator.publicKey,
            creator: creatorPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([creator])
          .rpc();
        console.log("This line should not be reached-1");
        expect.fail("Should have thrown an error for duplicate profile");
      } catch (error) {
        console.log("Error caught:", error);
        console.log("Error message:", error.message);
        console.log("Error code:", error.code);
        expect(error.message).to.include("already in use");
      }
    });

    it("Should handle maximum length name and bio", async () => {
      const creator = anchor.web3.Keypair.generate();
      const maxName = "A".repeat(33);
      const maxBio = "B".repeat(201);

      const [creatorPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("creator"), creator.publicKey.toBuffer()],
        program.programId
      );

      // Airdrop SOL to creator for rent
      await airdrop(provider.connection, creator.publicKey);

      try{
      await program.methods
        .createCreatorProfile(maxName, maxBio)
        .accounts({
          authority: creator.publicKey,
          creator: creatorPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([creator])
        .rpc();
        console.log("This line should not be reached-2");
        expect.fail("Should have thrown an error for exceeding max length");
      } catch (error) {
        console.log("Error caught:", error);
        console.log("Error message:", error.message);
        console.log("Error code:", error.code);
      }

    });

    it("Should fail with empty name", async () => {
      const creator = anchor.web3.Keypair.generate();
      const [creatorPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("creator"), creator.publicKey.toBuffer()],
        program.programId
      );

      // Airdrop SOL to creator for rent
      await airdrop(provider.connection, creator.publicKey);
      try {
        await program.methods
          .createCreatorProfile("", "Valid bio")
          .accounts({
            authority: creator.publicKey,
            creator: creatorPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([creator])
          .rpc();
        console.log("This line should not be reached-3");
        expect.fail("Should have thrown an error for empty name");
      } catch (error) {
        console.log("Error caught:", error);
        console.log("Error message:", error.message);
        console.log("Error code:", error.code);
        expect(error).to.exist;
      }
    });
  });

  describe("Send Tip", () => {
    it("Should send a tip to a creator successfully", async () => {
      const creator = anchor.web3.Keypair.generate();
      const tipper = anchor.web3.Keypair.generate();
      const name = "Tip Recipient";
      const bio = "Bio for tip recipient";
      const message = "Great content!";
      const tipAmount = 0.1 * anchor.web3.LAMPORTS_PER_SOL;
      const timestamp = Date.now();

      
      await airdrop(provider.connection, tipper.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
      
      
      const [creatorPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("creator"), creator.publicKey.toBuffer()],
        program.programId
      );

      
      await createCreatorProfile(
        provider.connection,
        creator,
        creatorPda,
      );
      
      const creatorAccount = await program.account.creator.fetch(creatorPda);
      const [tipPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("tip"),
          creatorPda.toBuffer(), 
          tipper.publicKey.toBuffer(),
          Buffer.from(creatorAccount.tipCount.toArray("le", 8)),
        ],
        program.programId
      );
      
      const tipperBalanceBefore = await provider.connection.getBalance(tipper.publicKey);
      const creatorBalanceBefore = await provider.connection.getBalance(creatorPda);

      console.log(`Tipper balance before: ${tipperBalanceBefore / anchor.web3.LAMPORTS_PER_SOL} SOL`);
      console.log(`Creator PDA balance before: ${creatorBalanceBefore / anchor.web3.LAMPORTS_PER_SOL} SOL`);

      // Send tip
      await program.methods
      .sendTip(
        new anchor.BN(tipAmount),
        message,
      )
      .accounts({
        tipper: tipper.publicKey,
        creator: creatorPda,
        tip: tipPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([tipper])
      .rpc();
      // Verify tip was recorded
      const tipAccount = await program.account.tip.fetch(tipPda);
      expect(tipAccount.creator.toBase58()).to.equal(creatorPda.toBase58());
      expect(tipAccount.tipper.toBase58()).to.equal(tipper.publicKey.toBase58());
      expect(tipAccount.amount.toNumber()).to.equal(tipAmount);
      expect(tipAccount.message).to.equal(message);

      // Verify creator account was updated
      const updatedCreatorAccount = await program.account.creator.fetch(creatorPda);
      expect(updatedCreatorAccount.totalTips.toNumber()).to.equal(tipAmount);
      expect(updatedCreatorAccount.tipCount.toNumber()).to.equal(1);

      // Verify balances changed
      const tipperBalanceAfter = await provider.connection.getBalance(tipper.publicKey);
      const creatorBalanceAfter = await provider.connection.getBalance(creatorPda);

      console.log(`Tipper balance after: ${tipperBalanceAfter / anchor.web3.LAMPORTS_PER_SOL} SOL`);
      console.log(`Creator PDA balance after: ${creatorBalanceAfter / anchor.web3.LAMPORTS_PER_SOL} SOL`);

      // The tipper should have less SOL (tip amount + gas fees)
      expect(tipperBalanceAfter).to.be.lessThan(tipperBalanceBefore);
      // The creator PDA should have more SOL (exactly the tip amount)
      expect(creatorBalanceAfter).to.equal(creatorBalanceBefore + tipAmount);
    });
    it("Should allow multiple users to tip the same creator", async () => {
      const creator = anchor.web3.Keypair.generate();
      const tipper1 = anchor.web3.Keypair.generate();
      const tipper2 = anchor.web3.Keypair.generate();
      
      const [creatorPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("creator"), creator.publicKey.toBuffer()],
        program.programId
      );

      await createCreatorProfile(provider.connection, creator, creatorPda);
      
      // Tipper 1 sends 0.1 SOL
      const tip1Amount = 0.1 * anchor.web3.LAMPORTS_PER_SOL;
      await airdrop(provider.connection, tipper1.publicKey);
      
      let creatorAccount = await program.account.creator.fetch(creatorPda);
      let [tip1Pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("tip"),
          creatorPda.toBuffer(), 
          tipper1.publicKey.toBuffer(),
          Buffer.from(creatorAccount.tipCount.toArray("le", 8)),
        ],
        program.programId
      );

      await program.methods.sendTip(new anchor.BN(tip1Amount), "Tip 1")
        .accounts({
          tipper: tipper1.publicKey,
          creator: creatorPda,
          tip: tip1Pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([tipper1])
        .rpc();

      // Tipper 2 sends 0.2 SOL
      const tip2Amount = 0.2 * anchor.web3.LAMPORTS_PER_SOL;
      await airdrop(provider.connection, tipper2.publicKey);
      
      // Fetch updated count for next PDA
      creatorAccount = await program.account.creator.fetch(creatorPda);
      let [tip2Pda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("tip"),
          creatorPda.toBuffer(), 
          tipper2.publicKey.toBuffer(),
          Buffer.from(creatorAccount.tipCount.toArray("le", 8)),
        ],
        program.programId
      );

      await program.methods.sendTip(new anchor.BN(tip2Amount), "Tip 2")
        .accounts({
          tipper: tipper2.publicKey,
          creator: creatorPda,
          tip: tip2Pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([tipper2])
        .rpc();

      // Verify State
      const finalCreatorAccount = await program.account.creator.fetch(creatorPda);
      expect(finalCreatorAccount.tipCount.toNumber()).to.equal(2);
      expect(finalCreatorAccount.totalTips.toNumber()).to.equal(tip1Amount + tip2Amount);
      
      // Verify Tip History (Querying all tips)
      const tips = await program.account.tip.all([
        {
          memcmp: {
            offset: 8, // Discriminator
            bytes: creatorPda.toBase58(),
          },
        },
      ]);
      expect(tips.length).to.equal(2);
    });

    it("Should fail when sending 0 SOL tip", async () => {
      const creator = anchor.web3.Keypair.generate();
      const tipper = anchor.web3.Keypair.generate();
      
      const [creatorPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("creator"), creator.publicKey.toBuffer()],
        program.programId
      );

      await createCreatorProfile(provider.connection, creator, creatorPda);
      await airdrop(provider.connection, tipper.publicKey);

      const creatorAccount = await program.account.creator.fetch(creatorPda);
      const [tipPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("tip"),
          creatorPda.toBuffer(), 
          tipper.publicKey.toBuffer(),
          Buffer.from(creatorAccount.tipCount.toArray("le", 8)),
        ],
        program.programId
      );

      try {
        await program.methods.sendTip(new anchor.BN(0), "Zero Tip")
          .accounts({
            tipper: tipper.publicKey,
            creator: creatorPda,
            tip: tipPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([tipper])
          .rpc();
        expect.fail("Should have failed with zero amount");
      } catch (error) {
        expect(error.message).to.include("InvalidTipAmount");
      }
    });

    it("Should fail when tipping more than wallet balance", async () => {
      const creator = anchor.web3.Keypair.generate();
      const tipper = anchor.web3.Keypair.generate();
      
      const [creatorPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("creator"), creator.publicKey.toBuffer()],
        program.programId
      );

      await createCreatorProfile(provider.connection, creator, creatorPda);
      
      // Airdrop only 1 SOL
      await airdrop(provider.connection, tipper.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL);

      const creatorAccount = await program.account.creator.fetch(creatorPda);
      const [tipPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("tip"),
          creatorPda.toBuffer(), 
          tipper.publicKey.toBuffer(),
          Buffer.from(creatorAccount.tipCount.toArray("le", 8)),
        ],
        program.programId
      );

      try {
        // Try to send 5 SOL
        await program.methods.sendTip(new anchor.BN(5 * anchor.web3.LAMPORTS_PER_SOL), "Huge Tip")
          .accounts({
            tipper: tipper.publicKey,
            creator: creatorPda,
            tip: tipPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([tipper])
          .rpc();
        expect.fail("Should have failed due to insufficient funds");
      } catch (error) {
        // This usually throws a system program error or simulation error
        expect(error).to.exist;
      }
    });

    it("Should fail when sending tip to invalid creator account", async () => {
      const fakeCreatorPda = anchor.web3.Keypair.generate().publicKey; // Random key, not a PDA
      const tipper = anchor.web3.Keypair.generate();
      await airdrop(provider.connection, tipper.publicKey);

      const [tipPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("tip"),
          fakeCreatorPda.toBuffer(), 
          tipper.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(0).toArray("le", 8)),
        ],
        program.programId
      );

      try {
        await program.methods.sendTip(new anchor.BN(1000), "Bad Tip")
          .accounts({
            tipper: tipper.publicKey,
            creator: fakeCreatorPda, // Invalid account
            tip: tipPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([tipper])
          .rpc();
        expect.fail("Should have failed with AccountNotInitialized or similar");
      } catch (error) {
        expect(error.message).to.include("AccountNotInitialized");
      }
    });
  });

  describe("Withdraw Tips", () => {
    it("Should Withdraw Tips Successfully", async () => {
      const creator = anchor.web3.Keypair.generate();
      
      const [creatorPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("creator"), creator.publicKey.toBuffer()],
        program.programId
      );

      await createCreatorProfile(
        provider.connection,
        creator,
        creatorPda,
      );

      const creatorAccount = await program.account.creator.fetch(creatorPda);
      const tipper = anchor.web3.Keypair.generate();
      const[tipPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("tip"),
          creatorPda.toBuffer(), 
          tipper.publicKey.toBuffer(),
          Buffer.from(creatorAccount.tipCount.toArray("le", 8)),
        ],
        program.programId
      );
      
      await sendTips(
        provider.connection,
        program,
        1 * anchor.web3.LAMPORTS_PER_SOL,
        tipPda,
        creatorPda,
        tipper,
      )

      const creatorBalanceBefore = await provider.connection.getBalance(creator.publicKey);
      const creatorPdaBalanceBefore = await provider.connection.getBalance(creatorPda);
      
      console.log(`Creator balance before withdrawal: ${creatorBalanceBefore / anchor.web3.LAMPORTS_PER_SOL} SOL`);
      console.log(`Creator PDA balance before withdrawal: ${creatorPdaBalanceBefore / anchor.web3.LAMPORTS_PER_SOL} SOL`);

      const [withdrawPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("withdrawal"), 
          creator.publicKey.toBuffer(),
          Buffer.from(creatorAccount.withdrawalCount.toArray("le", 8)),
        ],
        program.programId
      );

      // Withdraw all tips
      await program.methods
      .withdrawTips(
        new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL),
      )
      .accounts({
        authority: creator.publicKey,
        creator: creatorPda,
        withdrawalRecord: withdrawPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

      const creatorBalanceAfter = await provider.connection.getBalance(creator.publicKey);
      const creatorPdaBalanceAfter = await provider.connection.getBalance(creatorPda);

      console.log(`Creator balance after withdrawal: ${creatorBalanceAfter / anchor.web3.LAMPORTS_PER_SOL} SOL`);
      console.log(`Creator PDA balance after withdrawal: ${creatorPdaBalanceAfter / anchor.web3.LAMPORTS_PER_SOL} SOL`);

      // Creator's main account balance should increase
      expect(creatorBalanceAfter).to.be.greaterThan(creatorBalanceBefore);
      
      // Creator PDA balance should decrease
      expect(creatorPdaBalanceAfter).to.be.lessThan(creatorPdaBalanceBefore);

    });

    it("Should Withdraw More than one Part Of The Tips Successfully", async () => {
      const creator = anchor.web3.Keypair.generate();
      
      const [creatorPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("creator"), creator.publicKey.toBuffer()],
        program.programId
      );

      await createCreatorProfile(
        provider.connection,
        creator,
        creatorPda,
      );

      let creatorAccount = await program.account.creator.fetch(creatorPda);
      const tipper = anchor.web3.Keypair.generate();
      const[tipPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("tip"),
          creatorPda.toBuffer(), 
          tipper.publicKey.toBuffer(),
          Buffer.from(creatorAccount.tipCount.toArray("le", 8)),
        ],
        program.programId
      );
      
      await sendTips(
        provider.connection,
        program,
        1 * anchor.web3.LAMPORTS_PER_SOL,
        tipPda,
        creatorPda,
        tipper,
      )

      const creatorBalanceBefore = await provider.connection.getBalance(creator.publicKey);
      const creatorPdaBalanceBefore = await provider.connection.getBalance(creatorPda);
      
      console.log(`Creator balance before withdrawal: ${creatorBalanceBefore / anchor.web3.LAMPORTS_PER_SOL} SOL`);
      console.log(`Creator PDA balance before withdrawal: ${creatorPdaBalanceBefore / anchor.web3.LAMPORTS_PER_SOL} SOL`);

      let [withdrawPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("withdrawal"), 
          creator.publicKey.toBuffer(),
          Buffer.from(creatorAccount.withdrawalCount.toArray("le", 8)),
        ],
        program.programId
      );

      // Withdraw all tips
      await program.methods
      .withdrawTips(
        new anchor.BN(0.25 * anchor.web3.LAMPORTS_PER_SOL),
      )
      .accounts({
        authority: creator.publicKey,
        creator: creatorPda,
        withdrawalRecord: withdrawPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();
      
      creatorAccount = await program.account.creator.fetch(creatorPda);


      let creatorBalanceAfter = await provider.connection.getBalance(creator.publicKey);
      let creatorPdaBalanceAfter = await provider.connection.getBalance(creatorPda);

      console.log(`Creator balance after withdrawal: ${creatorBalanceAfter / anchor.web3.LAMPORTS_PER_SOL} SOL`);
      console.log(`Creator PDA balance after withdrawal: ${creatorPdaBalanceAfter / anchor.web3.LAMPORTS_PER_SOL} SOL`);

      [withdrawPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("withdrawal"), 
          creator.publicKey.toBuffer(),
          Buffer.from(creatorAccount.withdrawalCount.toArray("le", 8)),
        ],
        program.programId
      );
      
      await program.methods
      .withdrawTips(
        new anchor.BN(0.25 * anchor.web3.LAMPORTS_PER_SOL),
      )
      .accounts({
        authority: creator.publicKey,
        creatorAccount: creatorPda,
        withdrawalRecord: withdrawPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

      creatorBalanceAfter = await provider.connection.getBalance(creator.publicKey);
      creatorPdaBalanceAfter = await provider.connection.getBalance(creatorPda);

      console.log(`Creator balance after withdrawal: ${creatorBalanceAfter / anchor.web3.LAMPORTS_PER_SOL} SOL`);
      console.log(`Creator PDA balance after withdrawal: ${creatorPdaBalanceAfter / anchor.web3.LAMPORTS_PER_SOL} SOL`);

      // Creator's main account balance should increase
      expect(creatorBalanceAfter).to.be.greaterThan(creatorBalanceBefore);
      
      // Creator PDA balance should decrease
      expect(creatorPdaBalanceAfter).to.be.lessThan(creatorPdaBalanceBefore);
    });

    it("Cannot withdraw zero amount", async () => {
      const creator = anchor.web3.Keypair.generate();
      
      const [creatorPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("creator"), creator.publicKey.toBuffer()],
        program.programId
      );

      await createCreatorProfile(
        provider.connection,
        creator,
        creatorPda,
      );

      const creatorAccount = await program.account.creator.fetch(creatorPda);
      const tipper = anchor.web3.Keypair.generate();
      const [tipPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("tip"),
          creatorPda.toBuffer(), 
          tipper.publicKey.toBuffer(),
          Buffer.from(creatorAccount.tipCount.toArray("le", 8)),
        ],
        program.programId
      );
      
      // Send some tips first
      await sendTips(
        provider.connection,
        program,
        1 * anchor.web3.LAMPORTS_PER_SOL,
        tipPda,
        creatorPda,
        tipper,
      );

      const updatedCreatorAccount = await program.account.creator.fetch(creatorPda);
      const [withdrawPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("withdrawal"), 
          creator.publicKey.toBuffer(),
          Buffer.from(updatedCreatorAccount.withdrawalCount.toArray("le", 8)),
        ],
        program.programId
      );

      // Try to withdraw zero amount - should fail
      try {
        await program.methods
          .withdrawTips(
            new anchor.BN(0), // Zero amount
          )
          .accounts({
            authority: creator.publicKey,
            creatorAccount: creatorPda,
            withdrawalRecord: withdrawPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([creator])
          .rpc();
        
        expect.fail("Should have thrown an error for zero withdrawal amount");
      } catch (error) {
        console.log("Error caught:", error.message);
        expect(error).to.exist;
        expect(error.message).to.include("InvalidWithdrawalAmount");
      }
    });

    it("Cannot withdraw more than available tips", async () => {
      const creator = anchor.web3.Keypair.generate();
      
      const [creatorPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("creator"), creator.publicKey.toBuffer()],
        program.programId
      );

      await createCreatorProfile(
        provider.connection,
        creator,
        creatorPda,
      );

      const creatorAccount = await program.account.creator.fetch(creatorPda);
      const tipper = anchor.web3.Keypair.generate();
      const [tipPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("tip"),
          creatorPda.toBuffer(), 
          tipper.publicKey.toBuffer(),
          Buffer.from(creatorAccount.tipCount.toArray("le", 8)),
        ],
        program.programId
      );
      
      // Send 1 SOL in tips
      await sendTips(
        provider.connection,
        program,
        1 * anchor.web3.LAMPORTS_PER_SOL,
        tipPda,
        creatorPda,
        tipper,
      );

      const updatedCreatorAccount = await program.account.creator.fetch(creatorPda);
      const [withdrawPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("withdrawal"), 
          creator.publicKey.toBuffer(),
          Buffer.from(updatedCreatorAccount.withdrawalCount.toArray("le", 8)),
        ],
        program.programId
      );

      console.log(`Available tips balance: ${updatedCreatorAccount.tipsBalance.toNumber() / anchor.web3.LAMPORTS_PER_SOL} SOL`);

      // Try to withdraw more than available (2 SOL when only 1 SOL available)
      try {
        await program.methods
          .withdrawTips(
            new anchor.BN(2 * anchor.web3.LAMPORTS_PER_SOL), // More than available
          )
          .accounts({
            authority: creator.publicKey,
            creatorAccount: creatorPda,
            withdrawalRecord: withdrawPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([creator])
          .rpc();
        
        expect.fail("Should have thrown an error for insufficient tips");
      } catch (error) {
        console.log("Error caught:", error.message);
        expect(error).to.exist;
        expect(error.message).to.include("InsufficientTips");
      }
    });
    it("Should fail when unauthorized user tries to withdraw", async () => {
      const creator = anchor.web3.Keypair.generate();
      const unauthorized = anchor.web3.Keypair.generate();
      
      const [creatorPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("creator"), creator.publicKey.toBuffer()],
        program.programId
      );

      // const [unauthorizedPda] = anchor.web3.PublicKey.findProgramAddressSync(
      //   [Buffer.from("creator"), unauthorized.publicKey.toBuffer()],
      //   program.programId
      // );

      // Create profile and send tips
      await createCreatorProfile(
        provider.connection,
        creator,
        creatorPda,
      );

      // await createCreatorProfile(
      //   provider.connection,
      //   unauthorized,
      //   unauthorizedPda,
      // );

      let creatorAccount = await program.account.creator.fetch(creatorPda);
      // let unauthorizedAccount = await program.account.creator.fetch(unauthorizedPda);
      const tipper = anchor.web3.Keypair.generate();
      let [tipPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("tip"),
          creatorPda.toBuffer(), 
          tipper.publicKey.toBuffer(),
          Buffer.from(creatorAccount.tipCount.toArray("le", 8)),
        ],
        program.programId
      );
      
      await sendTips(
        provider.connection,
        program,
        1 * anchor.web3.LAMPORTS_PER_SOL,
        tipPda,
        creatorPda,
        tipper,
      );

      // [tipPda] = anchor.web3.PublicKey.findProgramAddressSync(
      //   [
      //     Buffer.from("tip"),
      //     unauthorizedPda.toBuffer(), 
      //     tipper.publicKey.toBuffer(),
      //     Buffer.from(unauthorizedAccount.tipCount.toArray("le", 8)),
      //   ],
      //   program.programId
      // );

      // await sendTips(
      //   provider.connection,
      //   program,
      //   1 * anchor.web3.LAMPORTS_PER_SOL,
      //   tipPda,
      //   unauthorizedPda,
      //   tipper,
      // );

      const updatedCreatorAccount = await program.account.creator.fetch(creatorPda);
      // const updatedUnauthorizedAccount = await program.account.creator.fetch(unauthorizedPda);


      // Airdrop to unauthorized user
      await airdrop(provider.connection, unauthorized.publicKey);

      const [withdrawPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("withdrawal"), 
          unauthorized.publicKey.toBuffer(), 
          Buffer.from(updatedCreatorAccount.withdrawalCount.toArray("le", 8)),
        ],
        program.programId
      );

      // Try to withdraw with wrong authority - should fail
      try {
        await program.methods
          .withdrawTips(
            new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL),
          )
          .accounts({
            authority: unauthorized.publicKey,  // Wrong authority
            creatorAccount: creatorPda,            // Correct creator account
            withdrawalRecord: withdrawPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([unauthorized])
          .rpc();

        expect.fail("Should have thrown an error for unauthorized withdrawal");
      } catch (error) {
        console.log("Error caught:", error.message);
        expect(error).to.exist;
        expect(error.message).to.include("seeds constraint");
      }
    });
    
  });
  
  describe("Update Profile", () => {
    it("Should update creator profile successfully", async () => {
      const creator = anchor.web3.Keypair.generate();
      const originalName = "Test Creator";
      const originalBio = "This is a test bio for our creator";
      const newName = "Updated Name";
      const newBio = "Updated bio with new information";

      const [creatorPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("creator"), creator.publicKey.toBuffer()],
        program.programId
      );

      // Create original profile
      await createCreatorProfile(
        provider.connection,
        creator,
        creatorPda,
      );

      // Verify original profile
      let creatorAccount = await program.account.creator.fetch(creatorPda);
      expect(creatorAccount.name).to.equal(originalName);
      expect(creatorAccount.bio).to.equal(originalBio);

      // Update profile
      await program.methods
        .updateProfile(newName, newBio)
        .accounts({
          authority: creator.publicKey,
          creator: creatorPda,
        })
        .signers([creator])
        .rpc();

      // Verify updated profile
      creatorAccount = await program.account.creator.fetch(creatorPda);
      expect(creatorAccount.name).to.equal(newName);
      expect(creatorAccount.bio).to.equal(newBio);
      expect(creatorAccount.authority.toBase58()).to.equal(creator.publicKey.toBase58());

      console.log(`Profile updated: ${newName} - ${newBio}`);
    });

    it("Should fail when unauthorized user tries to update profile", async () => {
      const creator = anchor.web3.Keypair.generate();
      const unauthorized = anchor.web3.Keypair.generate();

      const [creatorPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("creator"), creator.publicKey.toBuffer()],
        program.programId
      );

      // Create profile with original creator
      await createCreatorProfile(
        provider.connection,
        creator,
        creatorPda,
      );

      // Airdrop to unauthorized user
      await airdrop(provider.connection, unauthorized.publicKey);

      // Try to update with unauthorized user - should fail
      try {
        await program.methods
          .updateProfile("Hacked Name", "Hacked Bio")
          .accounts({
            authority: unauthorized.publicKey,  // Wrong authority
            creator: creatorPda,
          })
          .signers([unauthorized])
          .rpc();

        expect.fail("Should have thrown an error for unauthorized access");
      } catch (error) {
        console.log("Error caught:", error.message);
        expect(error).to.exist;
        expect(error.message).to.include("seeds constraint");
      }
    });

    it("Should fail with empty name", async () => {
      const creator = anchor.web3.Keypair.generate();

      const [creatorPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("creator"), creator.publicKey.toBuffer()],
        program.programId
      );

      // Create profile
      await createCreatorProfile(
        provider.connection,
        creator,
        creatorPda,
      );

      // Try to update with empty name - should fail
      try {
        await program.methods
          .updateProfile("", "Valid bio")
          .accounts({
            authority: creator.publicKey,
            creator: creatorPda,
          })
          .signers([creator])
          .rpc();

        expect.fail("Should have thrown an error for empty name");
      } catch (error) {
        console.log("Error caught:", error.message);
        expect(error).to.exist;
        expect(error.message).to.include("NameEmpty");
      }
    });

    it("Should fail with name too long", async () => {
      const creator = anchor.web3.Keypair.generate();
      const tooLongName = "A".repeat(33); // Assuming MAX_NAME_LEN is 32

      const [creatorPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("creator"), creator.publicKey.toBuffer()],
        program.programId
      );

      // Create profile
      await createCreatorProfile(
        provider.connection,
        creator,
        creatorPda,
      );

      // Try to update with too long name - should fail
      try {
        await program.methods
          .updateProfile(tooLongName, "Valid bio")
          .accounts({
            authority: creator.publicKey,
            creator: creatorPda,
          })
          .signers([creator])
          .rpc();

        expect.fail("Should have thrown an error for name too long");
      } catch (error) {
        console.log("Error caught:", error.message);
        expect(error).to.exist;
        expect(error.message).to.include("NameTooLong");
      }
    });

    it("Should fail with bio too long", async () => {
      const creator = anchor.web3.Keypair.generate();
      const tooLongBio = "B".repeat(201); // Assuming MAX_BIO_LEN is 200

      const [creatorPda] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("creator"), creator.publicKey.toBuffer()],
        program.programId
      );

      // Create profile
      await createCreatorProfile(
        provider.connection,
        creator,
        creatorPda,
      );
      let signature = "";
      // Try to update with too long bio - should fail
      try {
        signature = await program.methods
          .updateProfile("Valid name", tooLongBio)
          .accounts({
            authority: creator.publicKey,
            creator: creatorPda,
          })
          .signers([creator])
          .rpc();

        expect.fail("Should have thrown an error for bio too long");
      } catch (error) {
        console.log("Error caught:", error.message);
        expect(error).to.exist;
        expect(error.message).to.include("BioTooLong");
      }

      console.log("Transaction Signature:", signature);
      console.log(`View on Explorer: https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`);
    });
  });


  async function airdrop(
    connection: any,
    address: any,
    amount = 2 * anchor.web3.LAMPORTS_PER_SOL
  )
  {
    const signature = await connection.requestAirdrop(
      address, 
      amount
    );
    await connection.confirmTransaction(signature, "confirmed");
  }

  async function createCreatorProfile(
    connection: any,
    creator,
    creatorPda: any,
  ) {
    await airdrop(connection, creator.publicKey);
    const name = "Test Creator";
    const bio = "This is a test bio for our creator";
    const signature = await program.methods
      .createCreatorProfile(name, bio)
      .accounts({
        authority: creator.publicKey,
        creator: creatorPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

      console.log("Creator profile created at PDA:", creatorPda.toBase58());
      console.log("Transaction Signature:", signature);
      console.log(`View on Explorer: https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`);

  }
  async function sendTips(
    connection: any,
    program: any,
    amount = 1 * anchor.web3.LAMPORTS_PER_SOL,
    tipPda: any,
    creatorPda: any,
    tipper: any,
  ) {
    const message = "Tipping with 1 SOL";
    await airdrop(connection, tipper.publicKey);

    const signature = await program.methods
      .sendTip(
        new anchor.BN(amount),
        message,
      )
      .accounts({
        tipper: tipper.publicKey,
        creator: creatorPda,
        tip: tipPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([tipper])
      .rpc();
    console.log("Tip sent from", tipper.publicKey.toBase58(), "to creator PDA", creatorPda.toBase58());
    console.log("Transaction Signature:", signature);
      console.log(`View on Explorer: https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`);
  }

});

