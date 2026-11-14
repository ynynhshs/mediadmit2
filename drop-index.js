require('dotenv').config();
const mongoose = require('mongoose');

async function dropIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'medilink_lab_dev' });
    console.log('Connected to DB...');
    
    const collection = mongoose.connection.db.collection('users');
    await collection.dropIndex('username_1');
    console.log('✅ Successfully dropped the strict username_1 index!');
  } catch (error) {
    if (error.code === 27) { // IndexNotFound error
      console.log('Index already dropped or does not exist.');
    } else {
      console.error('Error:', error.message);
    }
  } finally {
    await mongoose.disconnect();
  }
}

dropIndex();