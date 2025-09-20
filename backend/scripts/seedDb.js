const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const movieService = require('../services/movieService');

// Load environment variables
require('dotenv').config();

// Sample movies to seed
const sampleMovies = [
  'The Matrix',
  'Inception',
  'The Dark Knight',
  'Pulp Fiction',
  'The Godfather',
  'Interstellar',
  'Fight Club',
  'The Shawshank Redemption',
  'Goodfellas',
  'The Lord of the Rings',
  'Star Wars',
  'Jurassic Park',
  'Titanic',
  'Avatar',
  'The Avengers'
];

// Default admin user
const defaultAdmin = {
  username: 'admin',
  email: 'admin@movieflix.com',
  password: 'admin123',
  role: 'admin'
};

// Default regular user
const defaultUser = {
  username: 'user',
  email: 'user@movieflix.com',
  password: 'user123',
  role: 'user'
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/movieflix', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedUsers = async () => {
  try {
    console.log('Seeding users...');
    
    // Check if admin exists
    const existingAdmin = await User.findOne({ email: defaultAdmin.email });
    if (!existingAdmin) {
      const admin = new User(defaultAdmin);
      await admin.save();
      console.log('✓ Admin user created');
    } else {
      console.log('✓ Admin user already exists');
    }
    
    // Check if regular user exists
    const existingUser = await User.findOne({ email: defaultUser.email });
    if (!existingUser) {
      const user = new User(defaultUser);
      await user.save();
      console.log('✓ Regular user created');
    } else {
      console.log('✓ Regular user already exists');
    }
    
  } catch (error) {
    console.error('Error seeding users:', error);
  }
};

const seedMovies = async () => {
  try {
    console.log('Seeding movies...');
    
    if (!process.env.OMDB_API_KEY) {
      console.log('⚠ OMDB API key not found. Skipping movie seeding.');
      console.log('Please add OMDB_API_KEY to your .env file to seed movies.');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const movieTitle of sampleMovies) {
      try {
        console.log(`Fetching: ${movieTitle}`);
        
        // Search for the movie
        const searchResults = await movieService.searchMovies(movieTitle, { useCache: false });
        
        if (searchResults.movies && searchResults.movies.length > 0) {
          successCount++;
          console.log(`✓ Successfully cached: ${movieTitle}`);
        } else {
          errorCount++;
          console.log(`✗ Not found: ${movieTitle}`);
        }
        
        // Add delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        errorCount++;
        console.log(`✗ Error fetching ${movieTitle}:`, error.message);
      }
    }
    
    console.log(`\nMovie seeding completed:`);
    console.log(`✓ Success: ${successCount} movies`);
    console.log(`✗ Errors: ${errorCount} movies`);
    
  } catch (error) {
    console.error('Error seeding movies:', error);
  }
};

const clearDatabase = async () => {
  try {
    console.log('Clearing database...');
    
    await User.deleteMany({});
    console.log('✓ Users cleared');
    
    await mongoose.connection.db.collection('movies').deleteMany({});
    console.log('✓ Movies cleared');
    
  } catch (error) {
    console.error('Error clearing database:', error);
  }
};

const displayStats = async () => {
  try {
    const userCount = await User.countDocuments();
    const movieCount = await mongoose.connection.db.collection('movies').countDocuments();
    const adminCount = await User.countDocuments({ role: 'admin' });
    
    console.log('\n=== Database Statistics ===');
    console.log(`Users: ${userCount} (${adminCount} admins)`);
    console.log(`Movies: ${movieCount}`);
    console.log('===========================\n');
    
    if (userCount > 0) {
      console.log('Default login credentials:');
      console.log('Admin - Email: admin@movieflix.com, Password: admin123');
      console.log('User  - Email: user@movieflix.com, Password: user123');
    }
    
  } catch (error) {
    console.error('Error displaying stats:', error);
  }
};

const runSeeder = async () => {
  try {
    await connectDB();
    
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
      case 'clear':
        await clearDatabase();
        break;
        
      case 'users':
        await seedUsers();
        break;
        
      case 'movies':
        await seedMovies();
        break;
        
      case 'stats':
        await displayStats();
        break;
        
      case 'fresh':
        await clearDatabase();
        await seedUsers();
        await seedMovies();
        break;
        
      default:
        await seedUsers();
        await displayStats();
    }
    
    console.log('Seeding completed!');
    
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Handle script execution
if (require.main === module) {
  console.log('MovieFlix Database Seeder');
  console.log('========================');
  console.log('Commands:');
  console.log('  npm run seed        - Seed users only');
  console.log('  npm run seed users  - Seed users only');
  console.log('  npm run seed movies - Seed movies only');
  console.log('  npm run seed fresh  - Clear DB and seed everything');
  console.log('  npm run seed clear  - Clear database');
  console.log('  npm run seed stats  - Show database stats');
  console.log('');
  
  runSeeder();
}

module.exports = {
  seedUsers,
  seedMovies,
  clearDatabase,
  displayStats,
  connectDB
};