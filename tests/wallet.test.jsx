import { expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { localDate } from '../src/lib/format';
import { MemoryRouter } from "react-router-dom";
import Dashboard from "../src/pages/Dashboard";
const { createWallet, updateWallet, deleteWallet } = vi.hoisted(() => ({ createWallet: vi.fn().mockResolvedValue({}), updateWallet: vi.fn().mockResolvedValue({}), deleteWallet: vi.fn().mockResolvedValue({}) }));
vi.mock("../src/state/AppContext", () => ({ useApp: () => ({
  transactions: [], budgets: [{ id: 1, category: 'Food', limit: 200, spent: 10, period: 'monthly', startDate: localDate().slice(0, 7) + '-01' }],
  wallets: [{ id: 2, name: 'Physical money', kind: 'cash', balance: 0, isDefault: true }, { id: 1, name: 'GCash', kind: 'digital', balance: 500 }],
  goals: [], profile: { name: 'Admin User' }, date: (d) => d,
  money: (value) => `$${value}`, currency: 'USD', createWallet, updateWallet, deleteWallet, notify: vi.fn(),
}) }));
it('includes saved wallet balances in totals and submits the wallet popup', async () => {
  render(<MemoryRouter><Dashboard /></MemoryRouter>);
  expect(screen.getByText('Total Budgeted').closest('.stat-card')).toHaveTextContent('$200');
  expect(screen.queryByText('$700')).not.toBeInTheDocument();
  expect(screen.getByText('$190')).toBeInTheDocument();
  expect(screen.getByText('GCash')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'eWallet' })).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'eWallet' }));
  fireEvent.click(screen.getByRole('button', { name: /Add wallet/ }));
  fireEvent.change(screen.getByLabelText('Wallet name'), { target: { value: 'Bank savings' } });
  fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'bank' } });
  fireEvent.change(screen.getByLabelText('Current balance (USD)'), { target: { value: '1000' } });
  const buttons = screen.getAllByRole('button', { name: 'Add wallet' });
  fireEvent.click(buttons.at(-1));
  await waitFor(() => expect(createWallet).toHaveBeenCalledWith({ name: 'Bank savings', kind: 'bank', balance: 1000 }));
});

it('edits an existing wallet', async () => {
  render(<MemoryRouter><Dashboard /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'eWallet' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit GCash' }));
  expect(screen.getByLabelText('Wallet name')).toHaveValue('GCash');
  fireEvent.change(screen.getByLabelText('Current balance (USD)'), { target: { value: '600' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(updateWallet).toHaveBeenCalledWith(1, { name: 'GCash', kind: 'digital', balance: 600, reason: 'Balance reconciliation' }));
});

it('allows editing the physical-money balance but prevents deleting or renaming it', async () => {
  render(<MemoryRouter><Dashboard /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'eWallet' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit Physical money' }));
  expect(screen.queryByRole('button', { name: 'Delete wallet' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Wallet name')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('Type')).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Current balance (USD)'), { target: { value: '100' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(updateWallet).toHaveBeenCalledWith(2, { name: 'Physical money', kind: 'cash', balance: 100, reason: 'Balance reconciliation' }));
});

it('asks for a password before deleting and shows a rejected password', async () => {
  deleteWallet.mockRejectedValueOnce(new Error('Incorrect password'));
  render(<MemoryRouter><Dashboard /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'eWallet' }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit GCash' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete wallet' }));
  expect(deleteWallet).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Confirm your password'), { target: { value: 'wrong-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirm deletion' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect password');
  expect(deleteWallet).toHaveBeenCalledWith(1, 'wrong-password');
});
