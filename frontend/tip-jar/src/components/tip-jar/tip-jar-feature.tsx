'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from '../solana/solana-provider';
import { AppHero } from '../app-hero';
import { TipJarCreate, TipJarList, UserOnboardingDialog, UpdateProfileDialog, WithdrawTipsDialog } from './tip-jar-ui';
import { useTipJarProgram } from './tip-jar-data-access';
import { useEffect, useState } from 'react';

export default function TipJarFeature() {
  const { publicKey } = useWallet();
  const { getCreators } = useTipJarProgram();
  const [userName, setUserName] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if current user is a creator
  const isCreator = getCreators.data?.some((account: any) => 
    account.account.authority.toString() === publicKey?.toString()
  );

  // Check for existing user name when wallet connects
  useEffect(() => {
    if (publicKey) {
      const storedName = localStorage.getItem(`user_name_${publicKey.toString()}`);
      if (storedName) {
        setUserName(storedName);
        setShowOnboarding(false);
      } else {
        setUserName(null);
        setShowOnboarding(true);
      }
    } else {
      setUserName(null);
      setShowOnboarding(false);
    }
  }, [publicKey]);

  const handleOnboardingComplete = (name: string) => {
    setUserName(name);
    setShowOnboarding(false);
  };

  return (
    <div>
      {/* Onboarding Modal */}
      {publicKey && (
        <UserOnboardingDialog 
          isOpen={showOnboarding} 
          onComplete={handleOnboardingComplete}
          walletAddress={publicKey.toString()}
        />
      )}

      <AppHero
        title="Solana Tip Jar"
        subtitle="Support your favorite creators directly on-chain."
      >
        {!publicKey ? (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <p className="mb-6 text-lg text-muted-foreground">Connect your wallet to start tipping or receiving.</p>
            <WalletButton />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <p className="text-2xl font-medium">
              Welcome back, <span className="text-primary font-bold">{userName || 'Friend'}</span>! 👋
            </p>
            <p className="text-sm text-muted-foreground font-mono bg-muted px-3 py-1 rounded-full">
              {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
            </p>
          </div>
        )}
      </AppHero>

      <div className="max-w-6xl mx-auto py-8 sm:px-6 lg:px-8">
        {/* Modular Action Bar */}
        {publicKey && !showOnboarding && (
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-card p-4 rounded-xl border shadow-sm">
            <div>
              <h2 className="text-xl font-bold">Explore Creators</h2>
              <p className="text-sm text-muted-foreground">Find content creators and show your support.</p>
            </div>
            <div className="flex gap-3">
              {!isCreator && <TipJarCreate />}
              {isCreator && (
                <>
                  <UpdateProfileDialog />
                  <WithdrawTipsDialog />
                </>
              )}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="min-h-[300px]">
          <TipJarList />
        </div>
      </div>
    </div>
  );
}