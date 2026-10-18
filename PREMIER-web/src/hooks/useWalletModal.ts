import { useWalletModalStore } from '@/store/walletModalStore';

/**
 * 全局钱包登录弹窗控制 hook
 * 可在项目任意组件中调用，执行 openWalletModal() 即显示弹窗
 *
 * @example
 * const { openWalletModal } = useWalletModal();
 * <button onClick={openWalletModal}>钱包登录</button>
 */
export function useWalletModal() {
  const open = useWalletModalStore((s) => s.open);
  const close = useWalletModalStore((s) => s.close);
  const isOpen = useWalletModalStore((s) => s.isOpen);

  return { openWalletModal: open, closeWalletModal: close, isWalletModalOpen: isOpen };
}
