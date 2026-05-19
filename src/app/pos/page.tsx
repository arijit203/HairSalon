"use client";

import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  Package,
  Scissors,
  CreditCard,
  Banknote,
  QrCode,
  ChevronRight,
  Tag,
  User,
  Receipt,
  X,
} from "lucide-react";
import { useState } from "react";

const catalogProducts = [
  { id: "p1", name: "Kérastase Serum", price: 2800, type: "product", emoji: "💆", stock: 18 },
  { id: "p2", name: "L'Oreal Masque", price: 1950, type: "product", emoji: "🧴", stock: 25 },
  { id: "p3", name: "OPI Nail Polish", price: 850, type: "product", emoji: "💅", stock: 8 },
  { id: "p4", name: "Moroccanoil Treatment", price: 3200, type: "product", emoji: "✨", stock: 32 },
  { id: "p5", name: "Cetaphil Moisturizer", price: 480, type: "product", emoji: "🌿", stock: 60 },
  { id: "s1", name: "Hair Cut & Style", price: 800, type: "service", emoji: "✂️", duration: "45 min" },
  { id: "s2", name: "Hair Coloring", price: 3999, type: "service", emoji: "🎨", duration: "2 hr" },
  { id: "s3", name: "Classic Facial", price: 1800, type: "service", emoji: "💆", duration: "1 hr" },
  { id: "s4", name: "Gel Manicure", price: 900, type: "service", emoji: "💅", duration: "1 hr" },
  { id: "s5", name: "Mani + Pedi Combo", price: 1399, type: "service", emoji: "🌸", duration: "1.5 hr" },
  { id: "s6", name: "Full Body Wax", price: 2800, type: "service", emoji: "🌟", duration: "1.5 hr" },
  { id: "s7", name: "Deep Conditioning", price: 2200, type: "service", emoji: "💧", duration: "1 hr" },
];

const recentTransactions = [
  { id: "#TXN-001", client: "Sophia Chen", amount: 6599, time: "11:30 AM", method: "card", items: 3 },
  { id: "#TXN-002", client: "Isabella Rose", amount: 1800, time: "10:45 AM", method: "upi", items: 1 },
  { id: "#TXN-003", client: "Emma Davis", amount: 2299, time: "9:15 AM", method: "cash", items: 2 },
];

type CartItem = { id: string; name: string; price: number; qty: number; type: string; emoji: string };

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedClient, setSelectedClient] = useState("Walk-in Customer");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("card");

  const filtered = catalogProducts.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = activeFilter === "All" || (activeFilter === "Products" && p.type === "product") || (activeFilter === "Services" && p.type === "service");
    return matchSearch && matchFilter;
  });

  const addToCart = (item: typeof catalogProducts[0]) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1, type: item.type, emoji: item.emoji }];
    });
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.id !== id));
  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c).filter(c => c.qty > 0));
  };

  const subtotal = cart.reduce((a, c) => a + c.price * c.qty, 0);
  const discountAmt = Math.round(subtotal * discount / 100);
  const tax = Math.round((subtotal - discountAmt) * 0.18);
  const total = subtotal - discountAmt + tax;

  const paymentMethods = [
    { id: "card", label: "Card", icon: CreditCard },
    { id: "cash", label: "Cash", icon: Banknote },
    { id: "upi", label: "UPI", icon: QrCode },
  ];

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-rose-400" />
            Point of Sale
          </h1>
          <p className="section-subtitle">Process sales for products & services</p>
        </div>
        <button className="btn-secondary">
          <Receipt className="w-4 h-4" />
          Recent Transactions
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 h-[calc(100vh-200px)]">
        {/* Catalog */}
        <div className="xl:col-span-3 flex flex-col gap-4 overflow-hidden">
          {/* Catalog Controls */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <input type="text" placeholder="Search products & services..." className="input-field pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex items-center rounded-xl overflow-hidden flex-shrink-0" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              {["All", "Products", "Services"].map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className="px-4 py-2.5 text-sm font-medium transition-all"
                  style={{
                    background: activeFilter === f ? "rgba(244,63,94,0.2)" : "transparent",
                    color: activeFilter === f ? "#fb7185" : "var(--text-muted)",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map(item => {
                const inCart = cart.find(c => c.id === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="glass-card p-4 text-left group relative overflow-hidden"
                    style={inCart ? { borderColor: "rgba(244,63,94,0.4)", background: "rgba(244,63,94,0.06)" } : {}}
                  >
                    {inCart && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: "#f43f5e" }}>
                        {inCart.qty}
                      </div>
                    )}
                    <div className="text-3xl mb-2">{item.emoji}</div>
                    <p className="text-sm font-semibold leading-tight mb-1" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold" style={{ color: "var(--text-primary)" }}>₹{item.price.toLocaleString()}</span>
                      <span className={`badge text-[10px] ${item.type === "product" ? "badge-info" : "badge-purple"}`}>
                        {item.type === "product" ? "Product" : "Service"}
                      </span>
                    </div>
                    {(item as any).stock && (
                      <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Stock: {(item as any).stock}</p>
                    )}
                    {(item as any).duration && (
                      <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>{(item as any).duration}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Recent Transactions</h3>
            <div className="space-y-2">
              {recentTransactions.map(txn => (
                <div key={txn.id} className="flex items-center justify-between text-xs py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <div>
                    <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{txn.client}</span>
                    <span className="ml-2" style={{ color: "var(--text-muted)" }}>{txn.items} items · {txn.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold" style={{ color: "var(--text-primary)" }}>₹{txn.amount.toLocaleString()}</span>
                    <span className="badge badge-success capitalize">{txn.method}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cart & Checkout */}
        <div className="xl:col-span-2 flex flex-col gap-4 overflow-hidden">
          <div className="glass-card flex flex-col overflow-hidden" style={{ flex: 1 }}>
            {/* Client Selector */}
            <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(244,63,94,0.15)" }}>
                <User className="w-4 h-4 text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Customer</p>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{selectedClient}</p>
              </div>
              <button className="text-xs px-3 py-1.5 rounded-lg" style={{ background: "rgba(244,63,94,0.1)", color: "#fb7185" }}>Change</button>
            </div>

            {/* Cart Title */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Cart ({cart.length})</h3>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs flex items-center gap-1" style={{ color: "#f87171" }}>
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center" style={{ color: "var(--text-muted)" }}>
                  <ShoppingCart className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm">Cart is empty</p>
                  <p className="text-xs mt-1">Add products or services from the catalog</p>
                </div>
              ) : cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-xl">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>₹{item.price.toLocaleString()} each</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/[0.08] transition-all">
                      <Minus className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                    </button>
                    <span className="text-sm font-semibold w-5 text-center" style={{ color: "var(--text-primary)" }}>{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/[0.08] transition-all">
                      <Plus className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                    </button>
                  </div>
                  <p className="text-sm font-bold w-20 text-right flex-shrink-0" style={{ color: "var(--text-primary)" }}>
                    ₹{(item.price * item.qty).toLocaleString()}
                  </p>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-300 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Checkout Summary */}
            {cart.length > 0 && (
              <div className="p-4 border-t space-y-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                {/* Discount */}
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                  <input
                    type="number"
                    placeholder="Discount %"
                    className="input-field py-2 text-xs"
                    value={discount || ""}
                    onChange={e => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                  />
                </div>

                {/* Totals */}
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Subtotal", value: `₹${subtotal.toLocaleString()}` },
                    { label: `Discount (${discount}%)`, value: `-₹${discountAmt.toLocaleString()}`, color: "#10b981" },
                    { label: "GST (18%)", value: `₹${tax.toLocaleString()}` },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between" style={{ color: row.color || "var(--text-secondary)" }}>
                      <span>{row.label}</span>
                      <span className="font-medium">{row.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                    <span className="font-bold" style={{ color: "var(--text-primary)" }}>Total</span>
                    <span className="text-lg font-bold text-gradient">₹{total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="flex gap-2">
                  {paymentMethods.map(method => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all"
                        style={{
                          background: paymentMethod === method.id ? "rgba(244,63,94,0.2)" : "rgba(255,255,255,0.04)",
                          border: paymentMethod === method.id ? "1px solid rgba(244,63,94,0.4)" : "1px solid rgba(255,255,255,0.06)",
                          color: paymentMethod === method.id ? "#fb7185" : "var(--text-muted)",
                        }}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px] font-medium">{method.label}</span>
                      </button>
                    );
                  })}
                </div>

                <button className="btn-primary w-full justify-center py-3.5 text-base">
                  Charge ₹{total.toLocaleString()}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
