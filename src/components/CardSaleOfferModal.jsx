import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';

/** Asks the buyer to accept or decline a card sale. AI buyers answer automatically (useAITurn). */
export default function CardSaleOfferModal() {
  const { cardSaleOffer, players, respondCardSale } = useGame();
  const seller = cardSaleOffer ? players.find((p) => p.id === cardSaleOffer.sellerId) : null;
  const buyer = cardSaleOffer ? players.find((p) => p.id === cardSaleOffer.buyerId) : null;
  const show = !!(cardSaleOffer && seller && buyer && !buyer.isAI);
  const card = cardSaleOffer?.card;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="card-sale-offer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 border-2 border-slate-500"
          >
            <h2 className="text-xl font-bold text-center text-white mb-2">Card offer</h2>
            <p className="text-slate-200 text-center mb-3">
              {seller.icon} {seller.name} offers {buyer.icon} {buyer.name} a {card?.type === 'penalty' ? 'Penalty' : 'Fate'} card
              for <span className="font-bold text-yellow-300">{cardSaleOffer.price}G</span>.
            </p>
            {card?.text && (
              <p className="text-slate-300 text-sm text-center italic mb-5">“{card.text}”</p>
            )}
            <p className="text-slate-400 text-xs text-center mb-4">{buyer.name}, it's your choice.</p>
            <div className="flex gap-2">
              <button
                onClick={() => respondCardSale(true)}
                className="flex-1 py-3 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Buy ({cardSaleOffer.price}G)
              </button>
              <button
                onClick={() => respondCardSale(false)}
                className="flex-1 py-3 rounded-lg font-bold bg-slate-600 hover:bg-slate-500 text-white"
              >
                Decline
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
