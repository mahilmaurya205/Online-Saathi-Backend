// src/services/wallet.service.js
// Wallet service for user balance, deduction, and transaction logic

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getWallet = async (userId) => {
  return prisma.wallet.findUnique({ where: { userId } });
};

const deductFromWallet = async (userId, amount, meta = {}) => {
  const wallet = await getWallet(userId);
  if (!wallet || wallet.balance < amount) {
    throw new Error('Insufficient balance');
  }
  await prisma.wallet.update({
    where: { userId },
    data: { balance: { decrement: amount } },
  });
  await prisma.walletTransaction.create({
    data: {
      userId,
      amount: -amount,
      type: 'DEBIT',
      meta,
    },
  });
  return true;
};

module.exports = {
  getWallet,
  deductFromWallet,
};
