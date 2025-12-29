import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';

import { getProvider, getProgram } from '../../lib/anchorClient';

export default function AcceptTransferPage() {
  const [params] = useSearchParams();
  const wallet = useWallet();

  const transferPda = params.get('transferPda') ?? '';
  const buyer = params.get('buyer') ?? '';

  const [status, setStatus] = useState('');

  async function accept() {
    try {
      if (!wallet.publicKey) throw new Error('Connect buyer wallet first');
      if (!transferPda) throw new Error('Missing transferPda');

      if (buyer && wallet.publicKey.toBase58() !== buyer) {
        throw new Error(`Wrong wallet. Expected buyer=${buyer}`);
      }

      setStatus('Accepting (buyer signs)...');

      const provider = getProvider(wallet);
      const program = getProgram(provider);

      await program.methods
        .acceptTransfer()
        .accounts({
          toOwner: wallet.publicKey,
          transferRequest: new PublicKey(transferPda),
        })
        .rpc();

      setStatus('✅ Buyer accepted. Now seller can Execute.');
    } catch (e: any) {
      setStatus(`❌ ${e?.message ?? String(e)}`);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Buyer: Accept Transfer</h1>

      <div style={{ marginTop: 10 }}>
        <WalletMultiButton />
        <div style={{ marginTop: 8, fontFamily: 'monospace' }}>
          Connected: {wallet.publicKey?.toBase58() ?? '—'}
        </div>
      </div>

      <hr style={{ margin: '18px 0' }} />

      <div style={{ display: 'grid', gap: 10 }}>
        <div>
          <b>Transfer PDA:</b>{' '}
          <span style={{ fontFamily: 'monospace' }}>{transferPda}</span>
        </div>

        <button onClick={accept} style={{ padding: 10, width: 220 }}>
          Accept (Sign)
        </button>

        <pre style={{ whiteSpace: 'pre-wrap', background: '#111', color: '#0f0', padding: 12 }}>
          {status || 'Status...'}
        </pre>
      </div>
    </main>
  );
}
