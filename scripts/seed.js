const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const Inventory = require('../src/models/Inventory');
const Order = require('../src/models/Order');

const seedDatabase = async () => {
  await connectDB();

  try {
    // 1. Wipe out existing data
    console.log('Purging old data...');
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Inventory.deleteMany({});
    await Order.deleteMany({});

    // 2. Seed Users (10 users with mixed roles)
    console.log('Seeding 10 highly specific custom users...');
    const saltRounds = 10;
    const commonPasswordHash = await bcrypt.hash('Password123!', saltRounds);

    const customUsersList = [
      { name: "Tashi", email: "tashi@gmail.com", role: "Administrator" },
      { name: "Sonam", email: "sonam@gmail.com", role: "Seller" },
      { name: "Pema", email: "pema@gmail.com", role: "Customer" },
      { name: "Dechen", email: "dechen@gmail.com", role: "Customer" },
      { name: "Karma", email: "karma@gmail.com", role: "Customer" },
      { name: "Tenzin", email: "tenzin@gmail.com", role: "Customer" },
      { name: "Norbu", email: "norbu@gmail.com", role: "Customer" },
      { name: "Saroj", email: "saroj@gmail.com", role: "Customer" },
      { name: "Nima", email: "nima@gmail.com", role: "Customer" },
      { name: "Kinley", email: "kinley@gmail.com", role: "Customer" }
    ];

    const usersData = customUsersList.map((user, index) => ({
      name: user.name,
      email: user.email,
      passwordHash: commonPasswordHash,
      role: user.role,
      savedAddresses: [
        { 
          street: `${(index + 1) * 115} Innovation Way`, 
          city: 'Metroville', 
          zip: `1000${index + 1}` 
        }
      ]
    }));

    // CRITICAL FIX: Re-inserting the missing save execution line
    const createdUsers = await User.insertMany(usersData);

    // 3. Seed Categories
    console.log('Seeding categories...');
    const categoriesData = [
      { name: 'Electronics' },
      { name: 'Apparel' },
      { name: 'Books' },
      { name: 'Home & Kitchen' },
      { name: 'Fitness' }
    ];
    const createdCategories = await Category.insertMany(categoriesData);

    // 4. Seed 50 Products with evolving custom names and attributes
    console.log('Seeding 50 products with custom target names...');
    const productsData = [];

    const customProductNames = [
      // Electronics
      "iPhone 15 Pro Max", "Sony WH-1000XM5 Headphones", "MacBook Pro M3", "Samsung Odyssey G9 Monitor", "Logitech MX Master 3S",
      "iPad Pro M2", "Anker Prime Power Bank", "Keychron K2 Keyboard", "Bose QuietComfort Ultra", "Asus ROG Ally",
      // Apparel
      "Nike Air Max Flyknit", "Levi's 501 Original Jeans", "Adidas Originals Hoodie", "Patagonia Torrentshell Jacket", "Uniqlo Airism Tee",
      "Zara Oversized Blazer", "Puma Caracal Sneakers", "North Face Nuptse Down Jacket", "Gymshark Vital Seamless Leggings", "Under Armour Tech Polo",
      // Books
      "Clean Code by Robert Martin", "Designing Data-Intensive Applications", "The Hobbit", "Atomic Habits", "Eloquent JavaScript",
      "The Pragmatic Programmer", "You Don't Know JS Yet", "Refactoring by Martin Fowler", "Head First Design Patterns", "Introduction to Algorithms",
      // Home & Kitchen
      "Instant Pot Duo Plus", "Philips Airfryer XXL", "Nespresso Vertuo Next", "Dyson V15 Detect Vacuum", "Brita XL Water Filter Pitcher",
      "iRobot Roomba j7", "KitchenAid Artisan Stand Mixer", "Ninja Professional Blender", "SodaStream Terra", "Le Creuset Enameled Cast Iron Dutch Oven",
      // Fitness
      "Bowflex SelectTech 552 Dumbbells", "Fitbit Charge 6", "Peloton Bike+", "Theragun Prime Massager", "Manduka Pro Yoga Mat",
      "Garmin Forerunner 965", "Hydro Flask 32 oz Wide Mouth", "TRX All-in-One Suspension Trainer", "Optimum Nutrition Whey Gold Standard", "Everlast Elite Training Boxing Gloves"
    ];

    for (let i = 1; i <= 50; i++) {
      const category = createdCategories[(i - 1) % createdCategories.length];
      let attributes = {};
      let tags = ['sale', 'retail'];

      const productName = customProductNames[i - 1] || `${category.name} Premium Choice Model v${i}`;

      if (category.name === 'Electronics') {
        attributes = { ram: '16GB', storage: '512GB NVMe SSD', warranty: '2 Years Manufacturer' };
        tags.push('tech', 'gadgets', 'premium');
      } else if (category.name === 'Apparel') {
        attributes = { fabric: '100% Organic Pima Cotton', gender: 'Unisex', fit: 'Slim Fit' };
        tags.push('fashion', 'clothing', 'apparel');
      } else if (category.name === 'Books') {
        attributes = { format: 'Paperback', pages: 350 + (i * 5), language: 'English' };
        tags.push('education', 'literature', 'books');
      } else if (category.name === 'Home & Kitchen') {
        attributes = { material: 'Stainless Steel', power: '1200W', dishwasherSafe: true };
        tags.push('home', 'kitchen', 'appliances');
      } else {
        attributes = { capacity: 'Heavy Duty Professional Grade', weight: `${0.5 * i}kg` };
        tags.push('fitness', 'wellness', 'gear');
      }

      productsData.push({
        name: productName,
        description: `Authentic high-end professional specification edition of ${productName}. Built for exceptional reliability and durability under extensive daily deployment parameters.`,
        category_id: category._id,
        tags: tags,
        variants: [
          { sku: `SKU-${category.name.substring(0,3).toUpperCase()}-${100 + i}-S`, color: 'Default Obsidian', size: 'Standard', price: parseFloat((19.99 + (i * 3)).toFixed(2)) },
          { sku: `SKU-${category.name.substring(0,3).toUpperCase()}-${100 + i}-P`, color: 'Platinum Premium', size: 'Pro Edition', price: parseFloat((49.99 + (i * 3)).toFixed(2)) }
        ],
        attributes: attributes
      });
    }
    const createdProducts = await Product.insertMany(productsData);

    // 5. Seed Inventory maps for every single product
    console.log('Initializing stock tracking logs inside Inventory...');
    const inventoryData = createdProducts.map(product => ({
      product_id: product._id,
      stock_level: 150, 
      reserved_stock: 0
    }));
    await Inventory.insertMany(inventoryData);

    // 6. Seed 20 historical system orders
    console.log(' Generating 20 sample customer transactional orders...');
    const ordersData = [];
    for (let i = 1; i <= 20; i++) {
      const buyer = createdUsers[i % createdUsers.length];
      const randomProduct1 = createdProducts[(i * 2) % createdProducts.length];
      const randomProduct2 = createdProducts[(i * 3) % createdProducts.length];

      const item1Price = randomProduct1.variants[0].price;
      const item2Price = randomProduct2.variants[0].price;
      const total = (item1Price * 1) + (item2Price * 2);

      ordersData.push({
        user_id: buyer._id,
        items: [
          { product_id: randomProduct1._id, sku: randomProduct1.variants[0].sku, quantity: 1, price_paid: item1Price },
          { product_id: randomProduct2._id, sku: randomProduct2.variants[0].sku, quantity: 2, price_paid: item2Price }
        ],
        totalPrice: parseFloat(total.toFixed(2)),
        status: i % 4 === 0 ? 'Shipped' : 'Placed',
        createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)) 
      });
    }
    await Order.insertMany(ordersData);

    console.log('Database Seeding Phase completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error executing database seeding parameters:', error);
    process.exit(1);
  }
};

seedDatabase();