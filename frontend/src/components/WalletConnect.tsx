import React, { useState, useEffect } from "react";
import { setAllowed, isAllowed, getAddress } from "@stellar/freighter-api";
import { Loader2, LogOut, Wallet } from './icons';
import { hasCustomRpcConfig, networkConfig } from '../config/network';
import { useToast } from '../context/ToastContext';
import { useTranslation } from '../i18n';
import CopyButton from './CopyButton';
import { discoverConnectedAddress } from "../lib/stellarAccount";

interface WalletConnectProps {
    walletAddress: string | null;
    onConnect: (address: string) => void;
    onDisconnect: () => void;
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';
export type ConnectionErrorType = 'permission' | 'noAddress' | 'failed';

const WalletConnect: React.FC<WalletConnectProps> = ({ walletAddress, onConnect, onDisconnect }) => {
    const [status, setStatus] = useState<ConnectionStatus>(walletAddress ? 'connected' : 'idle');
    const [errorType, setErrorType] = useState<ConnectionErrorType | null>(null);
    const toast = useToast();
    const { t } = useTranslation();

    useEffect(() => {
        if (walletAddress) {
            setStatus('connected');
        } else if (status === 'connected') {
            setStatus('idle');
        }
    }, [walletAddress]);

    useEffect(() => {
        let mounted = true;

        const syncConnection = async () => {
            // Only sync if we are not actively trying to connect
            if (status === 'connecting') return;

            const discoveredAddress = await discoverConnectedAddress();
            if (!mounted) return;

            if (discoveredAddress) {
                onConnect(discoveredAddress);
                setStatus('connected');
                setErrorType(null);
                return;
            }

            if (walletAddress) {
                onDisconnect();
                setStatus('idle');
                toast.info({
                    title: t('toast.walletDisconnected.title'),
                    description: t('toast.walletDisconnected.description'),
                });
            }
        };

        syncConnection();
        const interval = window.setInterval(syncConnection, 10000);

        return () => {
            mounted = false;
            window.clearInterval(interval);
        };
    }, [onConnect, onDisconnect, toast, walletAddress, status, t]);

    const handleConnect = async () => {
        setStatus('connecting');
        setErrorType(null);
        try {
            await setAllowed();
            const allowed = await isAllowed();
            if (!allowed.isAllowed) {
                setStatus('error');
                setErrorType('permission');
                toast.warning({
                    title: t('toast.walletPermissionRequired.title'),
                    description: t('toast.walletPermissionRequired.description'),
                });
                return;
            }

            const userInfo = await getAddress();
            if (!userInfo.address) {
                setStatus('error');
                setErrorType('noAddress');
                toast.warning({
                    title: t('toast.walletPermissionRequired.title'),
                    description: t('toast.walletPermissionRequired.description'),
                });
                return;
            }

            onConnect(userInfo.address);
            setStatus('connected');
            toast.success({
                title: t('toast.walletConnected.title'),
                description: t('toast.walletConnected.description'),
            });
        } catch (e: unknown) {
            console.error(e);
            setStatus('error');
            setErrorType('failed');
            toast.error({
                title: t('toast.walletConnectionFailed.title'),
                description: t('toast.walletConnectionFailed.description'),
            });
        }
    };

    const formatAddress = (addr: string) => {
        return `${addr.substring(0, 5)}...${addr.substring(addr.length - 4)}`;
    };

    let errorMessage = '';
    if (errorType === 'permission' || errorType === 'noAddress') {
        errorMessage = t('toast.walletPermissionRequired.description');
    } else if (errorType === 'failed') {
        errorMessage = t('toast.walletConnectionFailed.description');
    }

    if (walletAddress) {
        return (
            <div className="wallet-status flex items-center gap-md">
                <div
                    className="glass-panel"
                    style={{
                        padding: '8px 16px',
                        borderRadius: '99px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        border: '1px solid var(--accent-cyan-dim)',
                        boxShadow: '0 0 10px rgba(0,240,255,0.1)'
                    }}
                >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-cyan)', boxShadow: '0 0 8px var(--accent-cyan)' }} />
                    <div className="copy-field">
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }} title={walletAddress}>
                            {formatAddress(walletAddress)}
                        </span>
                        <CopyButton
                            value={walletAddress}
                            label="wallet address"
                            successDescription="The full wallet address has been copied to your clipboard."
                        />
                    </div>
                </div>
                <div
                    className="glass-panel"
                    style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-glass)',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        maxWidth: '260px'
                    }}
                    title={networkConfig.rpcUrl}
                >
                    {t('wallet.rpcPrefix')} {hasCustomRpcConfig ? t('wallet.rpcCustom') : t('wallet.rpcDefault')}
                </div>
                <button
                    className="btn btn-outline"
                    style={{ padding: '8px', borderRadius: '50%' }}
                    onClick={() => {
                        onDisconnect();
                        setStatus('idle');
                        toast.info({
                            title: t('toast.walletDisconnected.title'),
                            description: t('toast.walletDisconnected.description'),
                        });
                    }}
                    aria-label={t('wallet.disconnectAria')}
                >
                    <LogOut size={18} />
                </button>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button
                className="btn btn-primary animate-glow"
                onClick={handleConnect}
                disabled={status === 'connecting'}
            >
                {status === 'connecting' ? <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> : <Wallet size={18} />}
                {status === 'connecting' ? t('wallet.connecting') : t('wallet.connectFreighter')}
            </button>
            {status === 'error' && (
                <div 
                    className="form-error" 
                    style={{ 
                        marginTop: '8px', 
                        fontSize: '0.75rem', 
                        color: 'var(--text-error)',
                        textAlign: 'center',
                        maxWidth: '220px',
                        background: 'rgba(255, 75, 75, 0.1)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 75, 75, 0.2)'
                    }}
                >
                    {errorMessage}
                </div>
            )}
            <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
};

export default WalletConnect;
