const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require("crypto");
const Prescription = require('../../models/prescription.js');



router.post('/payment', async (req, res) => {
  console.log('payment call');
  const { value } = req.body;
  let prescriptions = await Prescription.findById(value).populate({
    path: 'prescribedMed.medicineId',
  });
  let prescribedMed = prescriptions.prescribedMed;
  let items_array = [];
  var subtotal = 200;
  var total = 200;
  items_array[0] = {
    tax: 0,
    sku: value,
    currency: 'INR',
    name: 'Visitation',
    description: 'Visitation',
    quantity: 1,
    price: '200.00',
  };
  if (prescribedMed) {
    prescribedMed.map((pre, index) => (
      (total += pre.medicineId.price * pre.qty),
      (subtotal += pre.medicineId.price * pre.qty),
      (items_array[index + 1] = {
        tax: 0,
        sku: pre.medicineId._id,
        currency: 'INR',
        name: pre.medicineId.name,
        description: pre.medicineId.description,
        quantity: pre.qty,
        price: (pre.medicineId.price).toFixed(2),
      })
    ));
  }

  // const options = {
  //   amount: total * 100, // amount in paisa
  //   currency: 'INR',
  //   receipt: value,
  //   payment_capture: 1,
  // };
  try{

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

  const options = {
    amount: total * 100,
    currency: "INR",
    receipt: crypto.randomBytes(10).toString("hex"),
  };


  instance.orders.create(options, function (err, order) {
    if (err) {
      console.log(err);
      res.status(500).json({
        status: 'fail',
        msg: 'Failed to create order',
      });
    } else {
      console.log(order);
      res.status(201).json({
        status: 'success',
        // orderId: order.id,
        // amount: order.amount / 100,
        data: order
      });
    }
  });
  }
  catch(error)
  {
    res.status(500).json({ message: "Internal Server Error!" });
    console.log(error);
  }
});


router.post("/verify", async (req, res) => {
	try {
		const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
			req.body.response;
    console.log("razorpay_order_id = " + razorpay_order_id);
    let prescriptionId = req.body.value;

		const sign = razorpay_order_id + "|" + razorpay_payment_id;
		const expectedSign = crypto
			.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
			.update(sign.toString())
			.digest("hex");

		if (razorpay_signature === expectedSign) 
    {

      console.log('payment completed successfully');
      let paid = await Prescription.findByIdAndUpdate(prescriptionId , { "paid": 1 });
      console.log("\npaid : " + paid);

			res.status(200).json({ message: "Payment verified successfully" });
		} else {
			res.status(400).json({ message: "Invalid signature sent!" });
		}
	} catch (error) {
		res.status(500).json({ message: "Internal Server Error!" });
		console.log(error);
	}
});

module.exports = router;



















/////////////////////////////
// const express = require('express');
// const router = express.Router();
// const paypal = require('paypal-rest-sdk');
// const Prescription = require("../../models/prescription.js");

// paypal.configure({
//   mode: 'sandbox', //sandbox or live
//   client_id: process.env.CLIENT_ID,
//   client_secret: process.env.CLIENT_SECRET,
// });

// router.post('/payment', async (req, res) => {
//   console.log('payment call');
//   const { value } = req.body;
//   let prescriptions = await Prescription.findById(value).populate({path: 'prescribedMed.medicineId'});
//   let prescribedMed = prescriptions.prescribedMed;
//   let items_array = [];
//   var subtotal = 200;
//   var total = 200;
//   items_array[0] = {"tax":0,"sku":value,"currency":"USD","name":"Visitation","description":"Visitation","quantity":1,"price":"200.00"}
//   if(prescribedMed){
//     prescribedMed.map((pre, index) => (
//       total+=(pre.medicineId.price*pre.qty),
//       subtotal+=(pre.medicineId.price*pre.qty),
//       items_array[index+1] = {"tax":0,"sku":pre.medicineId._id,"currency":"USD","name":pre.medicineId.name,"description":pre.medicineId.description,"quantity":pre.qty,"price":(pre.medicineId.price).toFixed(2)}
//     ));
//   }
 
//   let create_payment_json = {
//     intent: 'sale',
//     payer: {
//       payment_method: 'paypal',
//     },
//     redirect_urls: {
//       return_url: process.env.HOST + '/prescriptions/success?prescriptionId='+value,
//       cancel_url: process.env.HOST + '/prescriptions/cancel',
//     },
//     transactions: [
//       {
//         item_list: {
//           items: items_array,
//         },
//         amount: {
//           currency: 'USD',
//           total: total,
//           details: {
//             shipping: '0', //shipping
//             subtotal: subtotal, // subtotal
//             shipping_discount: '0.00', //shipping discount
//             insurance: '0.00', // insurance
//             handling_fee: '0.00', // handling fee
//             tax: '0', // tax
//           },
//         },
//         description: 'Prescription for '+value,
//         payment_options: {
//           allowed_payment_method: 'IMMEDIATE_PAY',
//         },
//       },
//     ],
//   };
 
//   paypal.payment.create(create_payment_json, function (error, payment) {
//     if (error) {
//       throw error;
//     } else {
//       for (let i = 0; i < payment.links.length; i++) {
//         if (payment.links[i].rel === 'approval_url') {
//           // res.redirect(payment.links[i].href);
//           res.status(201).json({
//             status: 'success',
//             link: payment.links[i].href,
//           });
//         }
//       }
//     }
//   });
// });

// router.get('/success', (req, res) => {
//   console.log(req.query);
//   var paymentId = req.query.paymentId;
//   var prescriptionId = req.query.prescriptionId;
//   var payerId = { payer_id: req.query.PayerID };

//   paypal.payment.execute(paymentId, payerId, async function (error, payment) {
//     if (error) {
//       console.error(JSON.stringify(error));
//     } else {
//       if (payment.state == 'approved') {
//         //console.log(JSON.stringify(payment, null, '\t'));
//         console.log('payment completed successfully');
//         let paid = await Prescription.findByIdAndUpdate(prescriptionId , { "paid": 1 });

//         res.status(201).json({
//           status: 'success',
//           payment: payment,
//         });
//         // res.send('Success');
//       } else {
//         res.status(400).json({
//           status: 'payment not successful',
//           payment: {},
//         });
//       }
//     }
//   });
// });

// router.get('/cancel', (req, res) =>
//   res.status(201).json({
//     status: 'fail',
//     msg: 'Please try again.',
//   })
// );

// module.exports = router;


// const express = require('express');
// const router = express.Router();
// const Razorpay = require('razorpay');
// const Prescription = require('../../models/prescription.js');

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// router.post('/payment', async (req, res) => {
//   console.log('payment call');
//   const { value } = req.body;
//   let prescriptions = await Prescription.findById(value).populate({
//     path: 'prescribedMed.medicineId',
//   });
//   let prescribedMed = prescriptions.prescribedMed;
//   let items_array = [];
//   var subtotal = 200;
//   var total = 200;
//   items_array[0] = {
//     tax: 0,
//     sku: value,
//     currency: 'INR',
//     name: 'Visitation',
//     description: 'Visitation',
//     quantity: 1,
//     price: '200.00',
//   };
//   if (prescribedMed) {
//     prescribedMed.map((pre, index) => (
//       (total += pre.medicineId.price * pre.qty),
//       (subtotal += pre.medicineId.price * pre.qty),
//       (items_array[index + 1] = {
//         tax: 0,
//         sku: pre.medicineId._id,
//         currency: 'INR',
//         name: pre.medicineId.name,
//         description: pre.medicineId.description,
//         quantity: pre.qty,
//         price: (pre.medicineId.price).toFixed(2),
//       })
//     ));
//   }

//   const options = {
//     amount: total * 100, // amount in paisa
//     currency: 'INR',
//     receipt: value,
//     payment_capture: 1,
//   };
//   razorpay.orders.create(options, function (err, order) {
//     if (err) {
//       console.log(err);
//       res.status(500).json({
//         status: 'fail',
//         msg: 'Failed to create order',
//       });
//     } else {
//       res.status(201).json({
//         status: 'success',
//         orderId: order.id,
//         amount: order.amount / 100,
//       });
//     }
//   });
// });

// router.post('/capture/:paymentId', async (req, res) => {
//   const paymentId = req.params.paymentId;
//   const { orderId } = req.body;

//   razorpay.payments.fetch(paymentId, async function (err, payment) {
//     if (err) {
//       console.log(err);
//       res.status(500).json({
//         status: 'fail',
//         msg: 'Payment capture failed',
//       });
//     } else {
//       const { amount, currency } = payment;
//       if (currency !== 'INR' || amount !== total * 100) {
//         res.status(400).json({
//           status: 'fail',
//           msg: 'Payment capture failed: Amount mismatch',
//         });
//       } else {
//         let paid = await Prescription.findByIdAndUpdate(orderId, { paid: 1 });
//         res.status(200).json({
//           status: 'success',
//           msg: 'Payment captured successfully',
//         });
//       }
//     }
//   });
// });

// module.exports = router;

