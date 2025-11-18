'use client';

import { useState, useEffect } from 'react';
import { useTipJarProgram } from './tip-jar-data-access';
import { ellipsify } from '@/lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';

// --- 1. User Onboarding Component ---
export function UserOnboardingDialog({ 
  isOpen, 
  onComplete, 
  walletAddress 
}: { 
  isOpen: boolean; 
  onComplete: (name: string) => void;
  walletAddress: string;
}) {
  const [tempName, setTempName] = useState('');

  const handleSave = () => {
    if (tempName.trim().length > 0) {
      localStorage.setItem(`user_name_${walletAddress}`, tempName);
      onComplete(tempName);
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[425px]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome to Tip Jar!</DialogTitle>
          <DialogDescription>
            Please choose a display name to continue. This is stored locally on your device.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="username">Your Name</Label>
            <Input
              id="username"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="e.g. CryptoFan123"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={tempName.trim().length === 0}>
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- 2. Creator Registration Component ---
export function TipJarCreate() {
  const { createProfile, program } = useTipJarProgram();
  const { connected, publicKey, connecting, wallet, disconnect, wallets } = useWallet();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    console.log('Available wallets:', wallets.map(w => ({
      name: w.adapter.name,
      readyState: w.adapter.readyState,
      connected: w.adapter.connected
    })));
  }, [wallets]);

  useEffect(() => {
    if (connecting) {
      const timeout = setTimeout(() => {
        console.warn('Connection timeout - disconnecting');
        disconnect();
        toast.error('Connection timeout. Please try again.');
      }, 15000);

      return () => clearTimeout(timeout);
    }
  }, [connecting, disconnect]);

  useEffect(() => {
    console.log('Wallet state:', { 
      connected, 
      publicKey: publicKey?.toString(), 
      connecting,
      walletName: wallet?.adapter.name,
      programReady: !!program
    });
  }, [connected, publicKey, connecting, wallet, program]);

  const isValid = name.length > 0 && name.length <= 32 && bio.length <= 200;
  const isWalletReady = connected && !!publicKey && !!program;

  const handleSubmit = async () => {
    if (!isWalletReady) {
      toast.error("Please connect your wallet first!");
      return;
    }
    
    try {
      console.log("Email collected (not sent to chain):", email);
      await createProfile.mutateAsync({ name, bio });
      setIsOpen(false);
      setName('');
      setBio('');
      setEmail('');
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleOpenDialog = () => {
    if (!wallet) {
      toast.error('Please select and connect a wallet first using the button in the header');
      return;
    }
    if (!connected) {
      toast.error('Please connect your wallet first');
      return;
    }
    setIsOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          size="default" 
          className="w-full md:w-auto"
          disabled={!isWalletReady || connecting}
          onClick={handleOpenDialog}
        >
          {connecting ? 'Connecting...' : 'Register as a Creator'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Register as a Creator</DialogTitle>
          <DialogDescription>
            Create your profile to start receiving tips from your supporters.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Creator Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 32))}
              placeholder="Your name or handle"
              maxLength={32}
            />
            <p className="text-xs text-muted-foreground">{name.length}/32 characters</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bio">Bio *</Label>
            <Input
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 200))}
              placeholder="Tell people about yourself"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">{bio.length}/200 characters</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
            <p className="text-xs text-muted-foreground">
              For notifications only, not stored on-chain
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || !isWalletReady || createProfile.isPending}
          >
            {createProfile.isPending ? 'Creating...' : 'Create Profile'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- 3. List Component with Integrated Tip Dialog ---
export function TipJarList() {
  const { getCreators, sendTip } = useTipJarProgram();
  const wallet = useWallet();
  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSendTip = async () => {
    if (!wallet.connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    const tipAmount = parseFloat(amount);
    if (isNaN(tipAmount) || tipAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!selectedCreator) return;

    try {
      await sendTip.mutateAsync({
        creatorAuthority: selectedCreator.account.authority,
        amount: tipAmount,
        message: message.trim(),
      });
      setIsDialogOpen(false);
      setAmount('');
      setMessage('');
      setSelectedCreator(null);
    } catch (error) {
      console.error('Tip error:', error);
    }
  };

  const openTipDialog = (account: any) => {
    setSelectedCreator(account);
    setIsDialogOpen(true);
  };

  if (getCreators.isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[280px] rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!getCreators.data?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-dashed bg-muted/20">
        <h3 className="text-xl font-semibold">No creators found</h3>
        <p className="text-muted-foreground mt-2">The platform is empty. Be the first to join!</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {getCreators.data.map((account: any) => {
          const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(account.account.name)}&background=random&size=128`;
          
          return (
            <div key={account.publicKey.toString()} className="group relative rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
              <div className="p-6 flex flex-col h-full gap-4">
                <div className="flex items-start gap-4">
                  <img 
                    src={avatarUrl} 
                    alt={account.account.name}
                    className="w-16 h-16 rounded-full border-2 border-primary/20"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold tracking-tight truncate">{account.account.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {ellipsify(account.account.authority.toString())}
                    </p>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
                  {account.account.bio}
                </p>
                
                <div className="pt-4 mt-auto border-t flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold">Total Tips</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {(account.account.totalTips.toNumber() / 1000000000).toFixed(4)} SOL
                    </span>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => openTipDialog(account)}
                    disabled={!wallet.connected}
                  >
                    Send Tip
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Send Tip to {selectedCreator?.account.name}</DialogTitle>
            <DialogDescription>
              Support this creator with SOL
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount (SOL) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.1"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Message (optional)</Label>
              <Input
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 140))}
                placeholder="Thanks for the great content!"
                maxLength={140}
              />
              <p className="text-xs text-muted-foreground">{message.length}/140 characters</p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleSendTip} 
              disabled={!amount || sendTip.isPending}
            >
              {sendTip.isPending ? 'Sending...' : `Send ${amount || '0'} SOL`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- 4. Update Profile Component ---
export function UpdateProfileDialog() {
  const { updateProfile, getCreators } = useTipJarProgram();
  const { connected, publicKey } = useWallet();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const myProfile = getCreators.data?.find((account: any) => 
    account.account.authority.toString() === publicKey?.toString()
  );

  useEffect(() => {
    if (myProfile && isOpen) {
      setName(myProfile.account.name);
      setBio(myProfile.account.bio);
    }
  }, [myProfile, isOpen]);

  const handleSubmit = async () => {
    if (!connected) {
      toast.error("Please connect your wallet first!");
      return;
    }
    
    try {
      await updateProfile.mutateAsync({ name, bio });
      setIsOpen(false);
    } catch (error: any) {
      console.error(error);
    }
  };

  if (!myProfile) return null;

  const isValid = name.length > 0 && name.length <= 32 && bio.length <= 200;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="default">
          Update Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Your Profile</DialogTitle>
          <DialogDescription>
            Edit your creator profile information
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="update-name">Creator Name *</Label>
            <Input
              id="update-name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 32))}
              placeholder="Your name or handle"
              maxLength={32}
            />
            <p className="text-xs text-muted-foreground">{name.length}/32 characters</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="update-bio">Bio *</Label>
            <Input
              id="update-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 200))}
              placeholder="Tell people about yourself"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">{bio.length}/200 characters</p>
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || updateProfile.isPending}
          >
            {updateProfile.isPending ? 'Updating...' : 'Update Profile'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- 5. Withdraw Tips Component ---
export function WithdrawTipsDialog() {
  const { withdrawTips, getCreators } = useTipJarProgram();
  const { connected, publicKey } = useWallet();
  const [amount, setAmount] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const myProfile = getCreators.data?.find((account: any) => 
    account.account.authority.toString() === publicKey?.toString()
  );

  if (!myProfile) return null;

  const availableBalance = myProfile.account.tipsBalance.toNumber() / 1000000000;

  const handleWithdraw = async () => {
    if (!connected) {
      toast.error("Please connect your wallet first!");
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (withdrawAmount > availableBalance) {
      toast.error(`Cannot withdraw more than available balance (${availableBalance.toFixed(4)} SOL)`);
      return;
    }
    
    try {
      await withdrawTips.mutateAsync({ amount: withdrawAmount });
      setIsOpen(false);
      setAmount('');
    } catch (error: any) {
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="default">
          Withdraw Tips
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Withdraw Tips</DialogTitle>
          <DialogDescription>
            Withdraw your accumulated tips to your wallet
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Available Balance</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {availableBalance.toFixed(4)} SOL
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="withdraw-amount">Amount (SOL) *</Label>
            <Input
              id="withdraw-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={availableBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.1"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setAmount(availableBalance.toString())}
              className="w-fit"
            >
              Max
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={handleWithdraw} 
            disabled={!amount || withdrawTips.isPending}
          >
            {withdrawTips.isPending ? 'Withdrawing...' : `Withdraw ${amount || '0'} SOL`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}