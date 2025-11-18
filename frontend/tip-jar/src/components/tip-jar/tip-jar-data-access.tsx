'use client';

import { TipJar } from '@/lib/tip_jar';
import TipJarIDL from '@/lib/tip_jar.json';
import { AnchorProvider, Program, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import toast from 'react-hot-toast';
import { useConnection, useWallet, AnchorWallet } from '@solana/wallet-adapter-react';

export function useTipJarProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const program = useMemo(() => {
    if (!wallet.connected || !wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      return null;
    }
    
    try {
      const provider = new AnchorProvider(
        connection, 
        wallet as AnchorWallet, 
        { 
          commitment: 'confirmed',
          preflightCommitment: 'confirmed',
        }
      );
      return new Program<TipJar>(TipJarIDL as TipJar, provider);
    } catch (error) {
      console.error('Failed to create program:', error);
      return null;
    }
  }, [connection, wallet.connected, wallet.publicKey]);

  const getCreators = useQuery({
    queryKey: ['tip-jar', 'all', { cluster: connection.rpcEndpoint }],
    queryFn: () => {
      if (!program) return Promise.resolve([]);
      return program.account.creator.all();
    },
    enabled: !!program,
  });

  const createProfile = useMutation({
    mutationKey: ['tip-jar', 'create', { cluster: connection.rpcEndpoint }],
    mutationFn: async ({ name, bio }: { name: string; bio: string }) => {
      if (!program) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }
      
      if (!wallet.publicKey) {
        throw new Error('Wallet public key not available');
      }

      const provider = program.provider as AnchorProvider;
      
      const balance = await connection.getBalance(provider.publicKey);
      console.log("Balance:", balance / LAMPORTS_PER_SOL, "SOL");
      
      if (balance < 0.01 * LAMPORTS_PER_SOL) {
        throw new Error(`Insufficient balance. You have ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL. Need at least 0.01 SOL. Get devnet SOL from https://faucet.solana.com`);
      }

      console.log("1. Wallet:", provider.publicKey.toString());

      const [creatorPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('creator'), provider.publicKey.toBuffer()],
        program.programId
      );
      
      console.log("2. PDA:", creatorPda.toString());
      console.log("3. Program ID:", program.programId.toString());

      try {
        const existingAccount = await program.account.creator.fetch(creatorPda);
        if (existingAccount) {
          throw new Error('Profile already exists for this wallet');
        }
      } catch (e: any) {
        if (!e.message.includes('Account does not exist')) {
          throw e;
        }
      }

      console.log("4. Sending transaction...");

      return await program.methods
        .createCreatorProfile(name, bio)
        .accounts({
          creator: creatorPda,
          authority: provider.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    },
    onSuccess: (signature) => {
      toast.success('Profile created!');
      console.log('✅ Transaction signature:', signature);
      console.log('🔗 View on explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
      getCreators.refetch();
    },
    onError: (error: any) => {
      console.error("❌ Detailed Error:", error);
      
      let errorMessage = 'Failed to create profile';
      
      if (error.message.includes('insufficient')) {
        errorMessage = error.message;
      } else if (error.message.includes('User rejected') || error.message.includes('User canceled')) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.message.includes('already exists')) {
        errorMessage = 'Profile already exists for this wallet';
      } else if (error.message.includes('Invalid cluster')) {
        errorMessage = 'Wrong network. Make sure your wallet and app are both on Devnet';
      } else if (error.logs) {
        console.log('Transaction logs:', error.logs);
        errorMessage = `Transaction failed. Check console for details.`;
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      toast.error(errorMessage);
    },
  });

  const sendTip = useMutation({
    mutationKey: ['tip-jar', 'send-tip', { cluster: connection.rpcEndpoint }],
    mutationFn: async ({ 
      creatorAuthority, 
      amount, 
      message 
    }: { 
      creatorAuthority: PublicKey; 
      amount: number; 
      message: string;
    }) => {
      if (!program) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }
      
      if (!wallet.publicKey) {
        throw new Error('Wallet public key not available');
      }

      const provider = program.provider as AnchorProvider;

      const balance = await connection.getBalance(provider.publicKey);
      const requiredAmount = amount * LAMPORTS_PER_SOL + 0.01 * LAMPORTS_PER_SOL;
      
      if (balance < requiredAmount) {
        throw new Error(`Insufficient balance. You need ${((requiredAmount) / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
      }

      console.log("1. Tipper:", provider.publicKey.toString());
      console.log("2. Creator Authority:", creatorAuthority.toString());
      console.log("3. Amount:", amount, "SOL");

      const [creatorPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('creator'), creatorAuthority.toBuffer()],
        program.programId
      );

      const creatorAccount = await program.account.creator.fetch(creatorPda);
      const tipCount = new BN(creatorAccount.tipCount.toString());

      const [tipPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('tip'),
          creatorPda.toBuffer(),
          provider.publicKey.toBuffer(),
          tipCount.toArrayLike(Buffer, 'le', 8)
        ],
        program.programId
      );

      console.log("4. Creator PDA:", creatorPda.toString());
      console.log("5. Tip PDA:", tipPda.toString());
      console.log("6. Tip Count:", tipCount.toString());
      console.log("7. Message:", message || "(no message)");

      const amountLamports = new BN(Math.floor(amount * LAMPORTS_PER_SOL));

      return await program.methods
        .sendTip(amountLamports, message)
        .accounts({
          tipper: provider.publicKey,
          creator: creatorPda,
          tip: tipPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    },
    onSuccess: (signature, variables) => {
      toast.success(`Tip of ${variables.amount} SOL sent successfully!`);
      console.log('✅ Tip transaction:', signature);
      console.log('🔗 View on explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
      getCreators.refetch();
    },
    onError: (error: any) => {
      console.error("❌ Tip Error:", error);
      
      let errorMessage = 'Failed to send tip';
      
      if (error.message.includes('insufficient')) {
        errorMessage = error.message;
      } else if (error.message.includes('User rejected') || error.message.includes('User canceled')) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.logs) {
        console.log('Transaction logs:', error.logs);
        errorMessage = 'Transaction failed. Check console for details.';
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      toast.error(errorMessage);
    },
  });

  const updateProfile = useMutation({
    mutationKey: ['tip-jar', 'update', { cluster: connection.rpcEndpoint }],
    mutationFn: async ({ name, bio }: { name: string; bio: string }) => {
      if (!program) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }
      
      if (!wallet.publicKey) {
        throw new Error('Wallet public key not available');
      }

      const provider = program.provider as AnchorProvider;

      const [creatorPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('creator'), provider.publicKey.toBuffer()],
        program.programId
      );

      console.log("Updating profile for:", creatorPda.toString());

      return await program.methods
        .updateProfile(name, bio)
        .accounts({
          authority: provider.publicKey,
          creator: creatorPda,
        })
        .rpc();
    },
    onSuccess: (signature) => {
      toast.success('Profile updated!');
      console.log('✅ Update transaction:', signature);
      console.log('🔗 View on explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
      getCreators.refetch();
    },
    onError: (error: any) => {
      console.error("❌ Update Error:", error);
      
      let errorMessage = 'Failed to update profile';
      
      if (error.message.includes('User rejected') || error.message.includes('User canceled')) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.logs) {
        console.log('Transaction logs:', error.logs);
        errorMessage = 'Transaction failed. Check console for details.';
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      toast.error(errorMessage);
    },
  });

  const withdrawTips = useMutation({
    mutationKey: ['tip-jar', 'withdraw', { cluster: connection.rpcEndpoint }],
    mutationFn: async ({ amount }: { amount: number }) => {
      if (!program) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }
      
      if (!wallet.publicKey) {
        throw new Error('Wallet public key not available');
      }

      const provider = program.provider as AnchorProvider;

      const [creatorPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('creator'), provider.publicKey.toBuffer()],
        program.programId
      );

      const creatorAccount = await program.account.creator.fetch(creatorPda);
      const withdrawalCount = new BN(creatorAccount.withdrawalCount.toString());

      const [withdrawalPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('withdrawal'),
          provider.publicKey.toBuffer(),
          withdrawalCount.toArrayLike(Buffer, 'le', 8)
        ],
        program.programId
      );

      console.log("Withdrawing from:", creatorPda.toString());
      console.log("Withdrawal record:", withdrawalPda.toString());
      console.log("Amount:", amount, "SOL");

      const amountLamports = new BN(Math.floor(amount * LAMPORTS_PER_SOL));

      return await program.methods
        .withdrawTips(amountLamports)
        .accounts({
          authority: provider.publicKey,
          creatorAccount: creatorPda,
          withdrawalRecord: withdrawalPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    },
    onSuccess: (signature, variables) => {
      toast.success(`Withdrawn ${variables.amount} SOL successfully!`);
      console.log('✅ Withdrawal transaction:', signature);
      console.log('🔗 View on explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
      getCreators.refetch();
    },
    onError: (error: any) => {
      console.error("❌ Withdrawal Error:", error);
      
      let errorMessage = 'Failed to withdraw tips';
      
      if (error.message.includes('InsufficientTipsBalance')) {
        errorMessage = 'Insufficient tips balance to withdraw';
      } else if (error.message.includes('User rejected') || error.message.includes('User canceled')) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.logs) {
        console.log('Transaction logs:', error.logs);
        errorMessage = 'Transaction failed. Check console for details.';
      } else {
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      toast.error(errorMessage);
    },
  });

  return {
    program,
    getCreators,
    createProfile,
    sendTip,
    updateProfile,
    withdrawTips,
  };
}

export function useCreatorProfile(authority: PublicKey) {
  const { connection } = useConnection();
  const wallet = useWallet();

  const program = useMemo(() => {
    if (!wallet.connected || !wallet.publicKey || !wallet.signTransaction) {
      return null;
    }
    const provider = new AnchorProvider(connection, wallet as AnchorWallet, { commitment: 'confirmed' });
    return new Program<TipJar>(TipJarIDL as TipJar, provider);
  }, [connection, wallet.connected, wallet.publicKey]);

  const creatorPda = useMemo(
    () => {
      if (!program) return null;
      return PublicKey.findProgramAddressSync(
        [Buffer.from('creator'), authority.toBuffer()],
        program.programId
      )[0];
    },
    [authority, program]
  );

  const accountQuery = useQuery({
    queryKey: ['tip-jar', 'fetch', { creatorPda: creatorPda?.toString() }],
    queryFn: () => {
      if (!program || !creatorPda) return null;
      return program.account.creator.fetch(creatorPda);
    },
    enabled: !!program && !!creatorPda,
  });

  return {
    creatorPda,
    accountQuery,
  };
}