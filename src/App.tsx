import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Phone, 
  User, 
  CreditCard, 
  CheckCircle2, 
  ChevronRight, 
  Plus, 
  Minus,
  UtensilsCrossed,
  MessageSquare
} from 'lucide-react';

// Menu Data
const MENU_ITEMS = [
  { id: 'v_atho', name: 'Veg Atho', price: 110, category: 'Main' },
  { id: 'e_atho', name: 'Egg Atho', price: 130, category: 'Main' },
  { id: 'v_banga', name: 'Veg Banga', price: 100, category: 'Main' },
  { id: 'e_banga', name: 'Egg Banga', price: 120, category: 'Main' },
  { id: 's_soup', name: 'Special Soup', price: 50, category: 'Side' },
  { id: 'e_bejo', name: 'Egg Bejo', price: 30, category: 'Side' },
];

const COMBO_OFFERS = [
  { id: 'c1', name: 'Veg Atho + Special Soup', price: 140, items: ['Veg Atho', 'Special Soup'] },
  { id: 'c2', name: 'Egg Atho + Soup + Egg Bejo', price: 199, items: ['Egg Atho', 'Soup', 'Egg Bejo'] },
  { id: 'c3', name: 'Egg Banga + Soup', price: 159, items: ['Egg Banga', 'Soup'] },
];

export default function App() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    transactionId: '',
  });
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState('');

  const totalAmount = useMemo(() => {
    let total = 0;
    Object.entries(cart).forEach(([id, qty]) => {
      const item = [...MENU_ITEMS, ...COMBO_OFFERS].find(i => i.id === id);
      if (item) total += item.price * qty;
    });
    return total;
  }, [cart]);

  const updateCart = (id: string, delta: number) => {
    setCart(prev => {
      const newQty = (prev[id] || 0) + delta;
      if (newQty <= 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: newQty };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalAmount === 0) {
      alert('Please select at least one item.');
      return;
    }
    if (!formData.transactionId) {
      alert('Please enter your UPI Transaction ID.');
      return;
    }

    setIsSubmitting(true);

    const orderItems = Object.entries(cart).map(([id, quantity]) => {
      const item = [...MENU_ITEMS, ...COMBO_OFFERS].find(i => i.id === id);
      return { name: item?.name, quantity, price: item?.price };
    });

    try {
      // 1. Prepare WhatsApp URL first
      const shopPhone = '919003735732'; 
      const orderItemsList = Object.entries(cart).map(([id, quantity]) => {
        const item = [...MENU_ITEMS, ...COMBO_OFFERS].find(i => i.id === id);
        return { name: item?.name, quantity, price: item?.price };
      });

      const orderDetails = orderItemsList
        .map(item => `• ${item.name} x ${item.quantity} = ₹${(item.price || 0) * item.quantity}`)
        .join('\n');
      
      const message = `*New Order from Suvai Surul!*
--------------------------
*Name:* ${formData.name}
*Phone:* ${formData.phone}
*Transaction ID:* ${formData.transactionId}
--------------------------
*Order Details:*
${orderDetails}
--------------------------
*Total Amount:* ₹${totalAmount}
--------------------------
Please confirm my order. Thank you!`;

      const encodedMessage = encodeURIComponent(message);
      const waUrl = `https://wa.me/${shopPhone}?text=${encodedMessage}`;
      setWhatsappUrl(waUrl);

      // 2. Submit to Google Sheets (Non-blocking for the UI)
      // We start the fetch but don't wait for it to finish before showing success
      // unless we want to be strictly sure it's recorded.
      // For better UX, we'll show success immediately after the request is sent.
      
      const sheetPromise = fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          orderItems: orderItemsList,
          total: totalAmount,
        }),
      });

      // Show success screen immediately
      setOrderComplete(true);

      // 3. Attempt redirect in a new tab
      // Some browsers block this if it's not the very first thing in the click handler
      const newWindow = window.open(waUrl, '_blank');
      
      // If blocked, we try a direct location change as a fallback
      if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
        console.warn('Popup blocked, trying direct redirect...');
        // We don't do window.location.href here because it would replace the success screen
        // Instead, we rely on the "Open WhatsApp" button on the success screen.
      }

      // Wait for sheet recording in the background
      await sheetPromise;

    } catch (error: any) {
      console.error('Submission error:', error);
      // Even if sheet fails, we are already in "orderComplete" state
      setOrderComplete(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-[#FDF6E3] flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border-t-8 border-[#D41C1C]"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-[#2D2D2D] mb-4">Order Placed!</h1>
          <p className="text-gray-600 mb-8">
            Your order has been recorded. We are redirecting you to WhatsApp to confirm your order.
          </p>
          
          <div className="space-y-4">
            <a 
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#128C7E] transition-colors shadow-lg animate-bounce"
            >
              <MessageSquare className="w-6 h-6" />
              Confirm on WhatsApp
            </a>
            <p className="text-xs text-gray-400">
              If WhatsApp didn't open automatically, please click the button above.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="text-gray-500 text-sm font-medium hover:text-[#D41C1C] transition-colors pt-4"
            >
              Back to Menu
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF6E3] font-sans text-[#2D2D2D]">
      {/* Hero Section */}
      <header className="relative h-64 overflow-hidden">
        <div className="absolute inset-0 bg-[#D41C1C]">
          <img 
            src="https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&q=80&w=1000" 
            alt="Burmese Food" 
            className="w-full h-full object-cover opacity-40 mix-blend-overlay"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#D41C1C] to-transparent" />
        </div>
        
        <div className="relative h-full flex flex-col items-center justify-center text-white px-6">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center"
          >
            <h1 className="text-5xl font-black tracking-tighter mb-2 italic">SUVAI SURUL</h1>
            <div className="flex items-center gap-2 justify-center">
              <span className="h-px w-8 bg-yellow-400" />
              <p className="text-yellow-400 font-bold tracking-widest uppercase text-sm">Burmese Street Food</p>
              <span className="h-px w-8 bg-yellow-400" />
            </div>
          </motion.div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 -mt-10 pb-24 relative z-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Customer Details Card */}
          <section className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-50 rounded-lg">
                <User className="w-5 h-5 text-[#D41C1C]" />
              </div>
              <h2 className="text-xl font-bold">Your Details</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">Full Name</label>
                <input 
                  required
                  type="text"
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#D41C1C] focus:outline-none transition-all bg-gray-50"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">Phone Number</label>
                <input 
                  required
                  type="tel"
                  placeholder="Enter your mobile number"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#D41C1C] focus:outline-none transition-all bg-gray-50"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>
          </section>

          {/* Menu Section */}
          <section className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-50 rounded-lg">
                <UtensilsCrossed className="w-5 h-5 text-[#D41C1C]" />
              </div>
              <h2 className="text-xl font-bold">Burmese Menu</h2>
            </div>

            <div className="space-y-4">
              {MENU_ITEMS.map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-red-100 transition-colors">
                  <div>
                    <h3 className="font-bold text-lg">{item.name}</h3>
                    <p className="text-[#D41C1C] font-bold">₹{item.price}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-1">
                    <button 
                      type="button"
                      onClick={() => updateCart(item.id, -1)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-6 text-center font-bold">{cart[item.id] || 0}</span>
                    <button 
                      type="button"
                      onClick={() => updateCart(item.id, 1)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors text-[#D41C1C]"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <ShoppingBag className="w-5 h-5 text-yellow-600" />
                </div>
                <h2 className="text-xl font-bold">Combo Offers</h2>
              </div>
              <div className="space-y-4">
                {COMBO_OFFERS.map(offer => (
                  <div key={offer.id} className="p-4 rounded-2xl bg-yellow-50/50 border border-yellow-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 bg-yellow-400 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-tighter">Best Value</div>
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <h3 className="font-bold text-lg">{offer.name}</h3>
                        <p className="text-yellow-700 font-bold">₹{offer.price}</p>
                      </div>
                      <div className="flex items-center gap-3 bg-white rounded-xl border border-yellow-200 p-1">
                        <button 
                          type="button"
                          onClick={() => updateCart(offer.id, -1)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-6 text-center font-bold">{cart[offer.id] || 0}</span>
                        <button 
                          type="button"
                          onClick={() => updateCart(offer.id, 1)}
                          className="p-2 hover:bg-yellow-50 rounded-lg transition-colors text-yellow-600"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Payment Section */}
          <section className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-50 rounded-lg">
                <CreditCard className="w-5 h-5 text-[#D41C1C]" />
              </div>
              <h2 className="text-xl font-bold">Payment Confirmation</h2>
            </div>

            <div className="bg-red-50 p-4 rounded-2xl mb-6 border border-red-100">
              <p className="text-sm text-red-800 font-medium">
                Please pay the total amount via UPI to <span className="font-bold select-all">suvaisurul@upi</span> and enter the Transaction ID below.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-dashed border-gray-200">
                <span className="text-gray-500 font-medium">Order Total</span>
                <span className="text-2xl font-black text-[#D41C1C]">₹{totalAmount}</span>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">UPI Transaction ID</label>
                <input 
                  required
                  type="text"
                  placeholder="12-digit Transaction ID"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-[#D41C1C] focus:outline-none transition-all bg-gray-50 font-mono"
                  value={formData.transactionId}
                  onChange={e => setFormData(prev => ({ ...prev, transactionId: e.target.value }))}
                />
              </div>
            </div>
          </section>

          {/* Submit Button */}
          <button 
            disabled={isSubmitting || totalAmount === 0}
            className={`w-full py-5 rounded-3xl font-black text-xl shadow-2xl transition-all flex items-center justify-center gap-3
              ${totalAmount > 0 
                ? 'bg-[#D41C1C] text-white hover:scale-[1.02] active:scale-[0.98]' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                PLACE ORDER <ChevronRight className="w-6 h-6" />
              </>
            )}
          </button>
        </form>
      </main>

      {/* Footer */}
      <footer className="bg-[#2D2D2D] text-white py-12 px-6 text-center">
        <h2 className="text-2xl font-black italic mb-2 tracking-tighter">SUVAI SURUL</h2>
        <p className="text-gray-400 text-sm mb-6">Authentic Burmese street food in every bite.</p>
        <div className="flex justify-center gap-4">
          <div className="w-8 h-8 bg-yellow-400 rounded-full" />
          <div className="w-8 h-8 bg-[#D41C1C] rounded-full" />
          <div className="w-8 h-8 bg-green-500 rounded-full" />
        </div>
      </footer>

      {/* Floating Cart Summary (Mobile) */}
      <AnimatePresence>
        {totalAmount > 0 && !orderComplete && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-6 left-6 right-6 z-50 md:hidden"
          >
            <div className="bg-[#2D2D2D] text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-white/10">
              <div className="flex items-center gap-3">
                <div className="bg-[#D41C1C] p-2 rounded-lg">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Total Amount</p>
                  <p className="text-lg font-black">₹{totalAmount}</p>
                </div>
              </div>
              <button 
                onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                className="bg-white text-black px-4 py-2 rounded-xl font-bold text-sm"
              >
                Checkout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
