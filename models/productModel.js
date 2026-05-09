const mongoose = require('mongoose');

// Product Schema
const productSchema = new mongoose.Schema({

  userId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User"
  }, 
  productName: {
    type: String,
    required: true,
    trim: true
  },
  productImg:[
    {
       url:{
        type:String, required:true
       },
       public_id:{
        type:String, required:true
       }
    }
  ],
  productDescription: {
    type: String,
    required: true
  },
  productPrice: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    required: true
  },
  stock: {
    type: Number,
    default: 0
  },
 
},{timestamps:true});

// Model export
module.exports = mongoose.model('Product', productSchema);