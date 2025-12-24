'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";
import styles from "./page.module.css";
import {
  Search, Filter, ShoppingCart, Package, ChevronRight,
  Loader2, AlertCircle, Plus, Minus, Trash2, User, Mail,
  Phone, Home, CreditCard, Check, X, ArrowLeft
} from 'lucide-react';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [cart, setCart] = useState([]);
  const [showCartSidebar, setShowCartSidebar] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [cartNotification, setCartNotification] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(null);
  // Order form state
  const [orderForm, setOrderForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Nederland',
    paymentMethod: 'ideal',
    termsAccepted: false
  });


  const API_BASE_URL = process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8080';

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/product/all`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setProducts(data);
      setFilteredProducts(data);

      // Extract unique categories
      const uniqueCategories = [...new Set(data.map(product => product.category))];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Kon producten niet laden. Probeer het later opnieuw.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort products
  useEffect(() => {
    let filtered = [...products];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(product =>
          product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.summary.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    switch (sortBy) {
      case 'price-low':
        filtered = filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-high':
        filtered = filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'newest':
        filtered = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'featured':
      default:
        break;
    }

    setFilteredProducts(filtered);
  }, [products, selectedCategory, searchTerm, sortBy]);

  // Add to cart with notification
  const addToCart = (product) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.uuid === product.uuid);
      let newCart;

      if (existingItem) {
        newCart = prev.map(item =>
            item.uuid === product.uuid
                ? { ...item, quantity: item.quantity + 1 }
                : item
        );
      } else {
        newCart = [...prev, { ...product, quantity: 1 }];
      }

      setCartNotification({
        product: product.title,
        quantity: existingItem ? existingItem.quantity + 1 : 1
      });

      setTimeout(() => setCartNotification(null), 3000);

      return newCart;
    });
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }

    setCart(prev =>
        prev.map(item =>
            item.uuid === productId
                ? { ...item, quantity: newQuantity }
                : item
        )
    );
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.uuid !== productId));
  };

  const calculateCartTotal = () => {
    return cart.reduce((total, item) => {
      return total + ((item.price || 0) * item.quantity);
    }, 0);
  };

  const formatPrice = (price) => {
    const priceNum = parseFloat(price);
    return isNaN(priceNum) ? '€0,00' : `€${priceNum.toFixed(2).replace('.', ',')}`;
  };

  const getProductsByCategory = (category) => {
    return products.filter(product => product.category === category);
  };

  // Handle order form input changes
  const handleOrderFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setOrderForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle order submission
  // Replace the existing handleOrderSubmit function with this:

// Handle order submission
  const handleOrderSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!orderForm.termsAccepted) {
      alert('U moet akkoord gaan met de algemene voorwaarden');
      return;
    }

    // Prepare cart items as formatted string like: "1x Super laken, 2x Zonnepaneel"
    const cartItemsString = cart.map(item =>
        `${item.quantity}x ${item.title}`
    ).join(', ');

    // Prepare order data matching the CreateOrderDto structure
    const orderData = {
      firstName: orderForm.firstName,
      lastName: orderForm.lastName,
      email: orderForm.email,
      phoneNumber: orderForm.phone,
      address: orderForm.address,
      zipCode: orderForm.postalCode,
      city: orderForm.city,
      country: orderForm.country,
      paymentMethod: orderForm.paymentMethod,
      agreesWithTermsAndPrivacy: orderForm.termsAccepted,
      cartItems: cartItemsString,
      orderTotal: calculateCartTotal().toString()
    };

    try {
      console.log('Sending order data:', orderData);
      console.log('Cart items string:', cartItemsString);

      // Send order to backend API
      const response = await fetch(`${API_BASE_URL}/order/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const orderResponse = await response.json();
      console.log('Order response:', orderResponse);

      // Clear cart and show success
      setCart([]);
      localStorage.removeItem('cart');

      // Store order info for success message
      const orderNumber = orderResponse.orderNumber || `ORD-${Math.floor(Math.random() * 1000000)}`;
      const orderEmail = orderForm.email;

      // Show success with order details
      setOrderSuccess({
        orderNumber,
        email: orderEmail,
        cartItems: cartItemsString
      });

      // Reset form after 5 seconds
      setTimeout(() => {
        setOrderSuccess(false);
        setShowOrderForm(false);
        resetOrderForm();
      }, 5000);

    } catch (error) {
      console.error('Error submitting order:', error);
      alert(`Er is een fout opgetreden bij het plaatsen van uw bestelling: ${error.message}. Probeer het opnieuw.`);
    }
  };  // Reset order form
  const resetOrderForm = () => {
    setOrderForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postalCode: '',
      country: 'Nederland',
      paymentMethod: 'ideal',
      termsAccepted: false
    });
  };

  // Initialize cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  if (isLoading) {
    return (
        <div className={styles.loadingContainer}>
          <Loader2 className={styles.spinner} size={48} />
          <p>Producten laden...</p>
        </div>
    );
  }

  if (error) {
    return (
        <div className={styles.errorContainer}>
          <AlertCircle size={48} />
          <h2>Er is iets misgegaan</h2>
          <p>{error}</p>
          <button onClick={fetchProducts} className={styles.retryButton}>
            Probeer opnieuw
          </button>
        </div>
    );
  }

  return (
      <div className={styles.page}>
        {/* Cart Notification */}
        {cartNotification && (
            <div className={styles.cartNotification}>
              <Package size={20} />
              <span>
            {cartNotification.quantity}x {cartNotification.product} toegevoegd aan winkelwagen!
          </span>
              <button
                  onClick={() => setCartNotification(null)}
                  className={styles.closeNotification}
              >
                ✕
              </button>
            </div>
        )}

        {/* Order Success Modal */}
        {/* Order Success Modal */}
        {orderSuccess && (
            <div className={styles.successOverlay}>
              <div className={styles.successModal}>
                <Check size={64} className={styles.successIcon} />
                <h2>Bestelling Geplaatst!</h2>
                <p>Bedankt voor uw bestelling. We hebben een bevestiging gestuurd naar {orderSuccess.email}.</p>
                <p>Uw bestelnummer: {orderSuccess.orderNumber}</p>
                <button
                    onClick={() => {
                      setOrderSuccess(null);
                      setShowOrderForm(false);
                      resetOrderForm();
                    }}
                    className={styles.successButton}
                >
                  Terug naar winkel
                </button>
              </div>
            </div>
        )}

        {/* Order Form Overlay */}
        {showOrderForm && !orderSuccess && (
            <div className={styles.orderOverlay}>
              <div className={styles.orderFormContainer}>
                <div className={styles.orderFormHeader}>
                  <button
                      onClick={() => setShowOrderForm(false)}
                      className={styles.backButton}
                  >
                    <ArrowLeft size={20} />
                    Terug naar winkelwagen
                  </button>
                  <h2>Bestelling Afronden</h2>
                  <button
                      onClick={() => setShowOrderForm(false)}
                      className={styles.closeFormButton}
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className={styles.orderFormContent}>
                  <div className={styles.orderSummary}>
                    <h3>Uw Bestelling</h3>
                    <div className={styles.orderItems}>
                      {cart.map(item => (
                          <div key={item.uuid} className={styles.orderItem}>
                            <div className={styles.orderItemImage}>
                              {item.imageUrl ? (
                                  <Image
                                      src={item.imageUrl}
                                      alt={item.title}
                                      width={50}
                                      height={50}
                                      className={styles.orderImage}
                                  />
                              ) : (
                                  <div className={styles.orderImagePlaceholder}>
                                    <Package size={24} />
                                  </div>
                              )}
                            </div>
                            <div className={styles.orderItemDetails}>
                              <h4>{item.title}</h4>
                              <div className={styles.orderItemInfo}>
                                <span>{item.quantity} x {formatPrice(item.price)}</span>
                                <span className={styles.orderItemTotal}>
                            {formatPrice(item.price * item.quantity)}
                          </span>
                              </div>
                            </div>
                          </div>
                      ))}
                    </div>
                    <div className={styles.orderTotals}>
                      <div className={styles.orderSubtotal}>
                        <span>Subtotaal:</span>
                        <span>{formatPrice(calculateCartTotal())}</span>
                      </div>
                      <div className={styles.orderShipping}>
                        <span>Verzending:</span>
                        <span>Gratis</span>
                      </div>
                      <div className={styles.orderTotal}>
                        <span>Totaal:</span>
                        <span className={styles.orderTotalAmount}>
                      {formatPrice(calculateCartTotal())}
                    </span>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleOrderSubmit} className={styles.orderForm}>
                    <div className={styles.formSection}>
                      <h3>
                        <User size={20} />
                        Persoonlijke Gegevens
                      </h3>
                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label>Voornaam *</label>
                          <input
                              type="text"
                              name="firstName"
                              value={orderForm.firstName}
                              onChange={handleOrderFormChange}
                              required
                              placeholder="Jouw voornaam"
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Achternaam *</label>
                          <input
                              type="text"
                              name="lastName"
                              value={orderForm.lastName}
                              onChange={handleOrderFormChange}
                              required
                              placeholder="Jouw achternaam"
                          />
                        </div>
                      </div>
                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label>
                            <Mail size={16} />
                            E-mailadres *
                          </label>
                          <input
                              type="email"
                              name="email"
                              value={orderForm.email}
                              onChange={handleOrderFormChange}
                              required
                              placeholder="jouw@email.nl"
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>
                            <Phone size={16} />
                            Telefoonnummer *
                          </label>
                          <input
                              type="tel"
                              name="phone"
                              value={orderForm.phone}
                              onChange={handleOrderFormChange}
                              required
                              placeholder="0612345678"
                          />
                        </div>
                      </div>
                    </div>

                    <div className={styles.formSection}>
                      <h3>
                        <Home size={20} />
                        Bezorgadres
                      </h3>
                      <div className={styles.formGroup}>
                        <label>Adres *</label>
                        <input
                            type="text"
                            name="address"
                            value={orderForm.address}
                            onChange={handleOrderFormChange}
                            required
                            placeholder="Straatnaam en huisnummer"
                        />
                      </div>
                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <label>Postcode *</label>
                          <input
                              type="text"
                              name="postalCode"
                              value={orderForm.postalCode}
                              onChange={handleOrderFormChange}
                              required
                              placeholder="1234 AB"
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label>Stad *</label>
                          <input
                              type="text"
                              name="city"
                              value={orderForm.city}
                              onChange={handleOrderFormChange}
                              required
                              placeholder="Amsterdam"
                          />
                        </div>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Land</label>
                        <select
                            name="country"
                            value={orderForm.country}
                            onChange={handleOrderFormChange}
                        >
                          <option value="Nederland">Nederland</option>
                          <option value="België">België</option>
                          <option value="Duitsland">Duitsland</option>
                          <option value="Frankrijk">Frankrijk</option>
                        </select>
                      </div>
                    </div>

                    <div className={styles.formSection}>
                      <h3>
                        <CreditCard size={20} />
                        Betaalmethode
                      </h3>
                      <div className={styles.paymentMethods}>
                        <label className={styles.paymentMethod}>
                          <input
                              type="radio"
                              name="paymentMethod"
                              value="ideal"
                              checked={orderForm.paymentMethod === 'ideal'}
                              onChange={handleOrderFormChange}
                          />
                          <div className={styles.paymentMethodContent}>
                            <span>iDEAL</span>
                            <small>Direct betalen via uw bank</small>
                          </div>
                        </label>
                        <label className={styles.paymentMethod}>
                          <input
                              type="radio"
                              name="paymentMethod"
                              value="creditcard"
                              checked={orderForm.paymentMethod === 'creditcard'}
                              onChange={handleOrderFormChange}
                          />
                          <div className={styles.paymentMethodContent}>
                            <span>Creditcard</span>
                            <small>Visa, Mastercard, American Express</small>
                          </div>
                        </label>
                        <label className={styles.paymentMethod}>
                          <input
                              type="radio"
                              name="paymentMethod"
                              value="paypal"
                              checked={orderForm.paymentMethod === 'paypal'}
                              onChange={handleOrderFormChange}
                          />
                          <div className={styles.paymentMethodContent}>
                            <span>PayPal</span>
                            <small>Snel en veilig betalen</small>
                          </div>
                        </label>
                        <label className={styles.paymentMethod}>
                          <input
                              type="radio"
                              name="paymentMethod"
                              value="banktransfer"
                              checked={orderForm.paymentMethod === 'banktransfer'}
                              onChange={handleOrderFormChange}
                          />
                          <div className={styles.paymentMethodContent}>
                            <span>Bankoverschrijving</span>
                            <small>Handmatig overmaken</small>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className={styles.formSection}>
                      <label className={styles.termsCheckbox}>
                        <input
                            type="checkbox"
                            name="termsAccepted"
                            checked={orderForm.termsAccepted}
                            onChange={handleOrderFormChange}
                            required
                        />
                        <span>
                      Ik ga akkoord met de <a href="/algemene-voorwaarden" target="_blank">algemene voorwaarden</a> en <a href="/privacybeleid" target="_blank">privacybeleid</a> *
                    </span>
                      </label>
                    </div>

                    <div className={styles.formActions}>
                      <button
                          type="button"
                          onClick={() => setShowOrderForm(false)}
                          className={styles.cancelButton}
                      >
                        Annuleren
                      </button>
                      <button
                          type="submit"
                          className={styles.submitOrderButton}
                          disabled={cart.length === 0}
                      >
                        <Check size={20} />
                        Bestelling Bevestigen
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
        )}

        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Ontdek Onze Collectie</h1>
            <p className={styles.heroSubtitle}>
              De beste selectie producten met ongeëvenaarde kwaliteit
            </p>
            <div className={styles.heroSearch}>
              <Search size={20} />
              <input
                  type="text"
                  placeholder="Zoek producten..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.searchInput}
              />
            </div>
          </div>
        </section>

        {/* Main Content */}
        <main className={styles.main}>
          {/* Sidebar Filters */}
          <aside className={styles.sidebar}>
            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>
                <Filter size={18} />
                Categorieën
              </h3>
              <div className={styles.categoryList}>
                <button
                    className={`${styles.categoryButton} ${selectedCategory === 'all' ? styles.active : ''}`}
                    onClick={() => setSelectedCategory('all')}
                >
                  Alle Producten ({products.length})
                </button>
                {categories.map(category => (
                    <button
                        key={category}
                        className={`${styles.categoryButton} ${selectedCategory === category ? styles.active : ''}`}
                        onClick={() => setSelectedCategory(category)}
                    >
                      {category} ({getProductsByCategory(category).length})
                      <ChevronRight size={16} />
                    </button>
                ))}
              </div>
            </div>

            <div className={styles.filterSection}>
              <h3 className={styles.filterTitle}>Sorteren op</h3>
              <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={styles.sortSelect}
              >
                <option value="featured">Aanbevolen</option>
                <option value="newest">Nieuwste</option>
                <option value="price-low">Prijs: Laag naar Hoog</option>
                <option value="price-high">Prijs: Hoog naar Laag</option>
              </select>
            </div>

            {/* Cart Summary */}
            <div className={styles.cartSummary}>
              <div className={styles.cartHeader}>
                <h3 className={styles.filterTitle}>
                  <ShoppingCart size={18} />
                  Winkelwagen ({cart.reduce((total, item) => total + item.quantity, 0)})
                </h3>
                {cart.length > 0 && (
                    <button
                        className={styles.viewCartButton}
                        onClick={() => setShowCartSidebar(true)}
                    >
                      Bekijk winkelwagen
                    </button>
                )}
              </div>

              {cart.length > 0 ? (
                  <div className={styles.cartItems}>
                    {cart.slice(0, 3).map(item => (
                        <div key={item.uuid} className={styles.cartItem}>
                          <div className={styles.cartItemImage}>
                            {item.imageUrl ? (
                                <Image
                                    src={item.imageUrl}
                                    alt={item.title}
                                    width={40}
                                    height={40}
                                    className={styles.cartImage}
                                />
                            ) : (
                                <div className={styles.cartImagePlaceholder}>
                                  <Package size={20} />
                                </div>
                            )}
                          </div>
                          <div className={styles.cartItemInfo}>
                            <span className={styles.cartItemTitle}>{item.title}</span>
                            <div className={styles.cartItemDetails}>
                              <span className={styles.cartItemPrice}>{formatPrice(item.price)}</span>
                              <span className={styles.cartItemQuantity}>x{item.quantity}</span>
                            </div>
                          </div>
                        </div>
                    ))}
                    {cart.length > 3 && (
                        <div className={styles.moreItems}>+{cart.length - 3} meer producten</div>
                    )}

                    <div className={styles.cartTotal}>
                      <span>Totaal:</span>
                      <span className={styles.cartTotalAmount}>{formatPrice(calculateCartTotal())}</span>
                    </div>

                    <button
                        className={styles.checkoutButton}
                        onClick={() => setShowOrderForm(true)}
                        disabled={cart.length === 0}
                    >
                      <ShoppingCart size={18} />
                      Naar bestellen
                    </button>
                  </div>
              ) : (
                  <p className={styles.emptyCart}>Uw winkelwagen is leeg</p>
              )}
            </div>
          </aside>

          {/* Product Grid */}
          <div className={styles.content}>
            {/* Category Banner */}
            {selectedCategory !== 'all' && (
                <div className={styles.categoryBanner}>
                  <h2>{selectedCategory}</h2>
                  <p>{getProductsByCategory(selectedCategory).length} producten beschikbaar</p>
                </div>
            )}

            {/* Products Grid */}
            <div className={styles.productsGrid}>
              {filteredProducts.length === 0 ? (
                  <div className={styles.noResults}>
                    <Package size={48} />
                    <h3>Geen producten gevonden</h3>
                    <p>Pas uw zoekopdracht of categorie filter aan</p>
                  </div>
              ) : (
                  filteredProducts.map(product => (
                      <div key={product.uuid} className={styles.productCard}>
                        <div className={styles.productImageContainer}>
                          {product.imageUrl ? (
                              <Image
                                  src={product.imageUrl}
                                  alt={product.title}
                                  fill
                                  className={styles.productImage}
                                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              />
                          ) : (
                              <div className={styles.imagePlaceholder}>
                                <Package size={48} />
                                <span>Geen afbeelding</span>
                              </div>
                          )}
                        </div>

                        <div className={styles.productInfo}>
                          <div className={styles.productHeader}>
                      <span className={styles.productCategory}>
                        {product.category}
                      </span>
                          </div>

                          <h3 className={styles.productTitle}>{product.title}</h3>

                          <p className={styles.productDescription}>
                            {product.summary.length > 120
                                ? `${product.summary.substring(0, 120)}...`
                                : product.summary}
                          </p>

                          <div className={styles.productFooter}>
                            <div className={styles.productPrice}>
                              {formatPrice(product.price)}
                            </div>

                            <div className={styles.productActions}>
                              <button
                                  className={styles.cartButton}
                                  onClick={() => addToCart(product)}
                              >
                                <ShoppingCart size={18} />
                                In winkelwagen
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                  ))
              )}
            </div>
          </div>
        </main>

        {/* Cart Sidebar */}
        {showCartSidebar && (
            <div className={styles.cartSidebarOverlay} onClick={() => setShowCartSidebar(false)}>
              <div className={styles.cartSidebar} onClick={(e) => e.stopPropagation()}>
                <div className={styles.cartSidebarHeader}>
                  <h2>
                    <ShoppingCart size={24} />
                    Winkelwagen
                  </h2>
                  <button
                      onClick={() => setShowCartSidebar(false)}
                      className={styles.closeSidebar}
                  >
                    ✕
                  </button>
                </div>

                <div className={styles.cartSidebarContent}>
                  {cart.length === 0 ? (
                      <div className={styles.emptyCartSidebar}>
                        <Package size={64} />
                        <p>Uw winkelwagen is leeg</p>
                        <button
                            onClick={() => setShowCartSidebar(false)}
                            className={styles.continueShopping}
                        >
                          Verder winkelen
                        </button>
                      </div>
                  ) : (
                      <>
                        <div className={styles.cartSidebarItems}>
                          {cart.map(item => (
                              <div key={item.uuid} className={styles.cartSidebarItem}>
                                <div className={styles.cartSidebarItemImage}>
                                  {item.imageUrl ? (
                                      <Image
                                          src={item.imageUrl}
                                          alt={item.title}
                                          width={60}
                                          height={60}
                                          className={styles.cartSidebarImage}
                                      />
                                  ) : (
                                      <div className={styles.cartSidebarImagePlaceholder}>
                                        <Package size={24} />
                                      </div>
                                  )}
                                </div>
                                <div className={styles.cartSidebarItemInfo}>
                                  <h4>{item.title}</h4>
                                  <div className={styles.cartSidebarItemPrice}>
                                    {formatPrice(item.price)} per stuk
                                  </div>
                                  <div className={styles.cartSidebarItemControls}>
                                    <button
                                        onClick={() => updateCartQuantity(item.uuid, item.quantity - 1)}
                                        className={styles.quantityButton}
                                    >
                                      <Minus size={16} />
                                    </button>
                                    <span className={styles.quantityDisplay}>{item.quantity}</span>
                                    <button
                                        onClick={() => updateCartQuantity(item.uuid, item.quantity + 1)}
                                        className={styles.quantityButton}
                                    >
                                      <Plus size={16} />
                                    </button>
                                    <button
                                        onClick={() => removeFromCart(item.uuid)}
                                        className={styles.removeButton}
                                        title="Verwijderen"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                          ))}
                        </div>

                        <div className={styles.cartSidebarSummary}>
                          <div className={styles.cartSidebarTotal}>
                            <span>Totaalbedrag:</span>
                            <span className={styles.cartSidebarTotalAmount}>
                        {formatPrice(calculateCartTotal())}
                      </span>
                          </div>

                          <button
                              className={styles.checkoutButtonFull}
                              onClick={() => {
                                setShowCartSidebar(false);
                                setShowOrderForm(true);
                              }}
                              disabled={cart.length === 0}
                          >
                            <ShoppingCart size={20} />
                            Bestellen
                          </button>

                          <button
                              onClick={() => setShowCartSidebar(false)}
                              className={styles.continueShoppingButton}
                          >
                            Verder winkelen
                          </button>
                        </div>
                      </>
                  )}
                </div>
              </div>
            </div>
        )}

        {/* Featured Categories Section */}
        <section className={styles.featuredCategories}>
          <h2>Shop op Categorie</h2>
          <div className={styles.categoriesGrid}>
            {categories.slice(0, 6).map(category => (
                <div
                    key={category}
                    className={styles.categoryCard}
                    onClick={() => setSelectedCategory(category)}
                >
                  <div className={styles.categoryIcon}>
                    <Package size={32} />
                  </div>
                  <h3>{category}</h3>
                  <p>{getProductsByCategory(category).length} producten</p>
                </div>
            ))}
          </div>
        </section>

        {/* Newsletter Section */}
        <section className={styles.newsletter}>
          <div className={styles.newsletterContent}>
            <h2>Blijf op de Hoogte</h2>
            <p>Schrijf u in voor onze nieuwsbrief voor de nieuwste producten en aanbiedingen</p>
            <form className={styles.newsletterForm}>
              <input
                  type="email"
                  placeholder="Voer uw e-mailadres in"
                  className={styles.newsletterInput}
              />
              <button type="submit" className={styles.newsletterButton}>
                Inschrijven
              </button>
            </form>
          </div>
        </section>
      </div>
  );
}