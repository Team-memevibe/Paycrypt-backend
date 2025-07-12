import axios from "axios";
import { Order } from "../models/order.js";
import { processAirtime, processData, processTV } from "./services/vtpassService.js";
import { checkPaymentStatus, releaseFunds, initiateRefund } from "./services/smartContractService.js";
import { handleError } from "./utils/errorHandler.js";

async function processAirtimePurchase(data) {
  const order = await Order.create({ ...data, service: "airtime", status: "pending" });

  try {
    // 1. Call checkPaymentStatus from smartContractService.js to verify crypto payment status for the order.
    const paymentConfirmed = await checkPaymentStatus(order._id); // Assuming order._id is used as identifier

    if (paymentConfirmed) {
      // 2. If payment is confirmed:
      try {
        // a. Call the appropriate VTpass processing function
        const vtpassResponse = await processAirtime(data);

        // b. Based on the VTpass response, update the order status in the database.
        if (vtpassResponse.success) {
          order.status = "success";
          // TODO: Store vtpassTxnId or other relevant info
        } else {
          order.status = "failed";
          // d. If VTpass transaction fails, call initiateRefund from smartContractService.js.
          await initiateRefund(order._id);
        }
        await order.save();

        // c. If VTpass transaction is successful, call releaseFunds from smartContractService.js.
        if (order.status === "success") {
          await releaseFunds(order._id);
        }

      } catch (vtpassError) {
        // Handle errors during VTpass interaction
        handleError(vtpassError, `VTpass processing for order ${order._id}`);
        order.status = "failed";
        await order.save();
        // d. If VTpass transaction fails, call initiateRefund from smartContractService.js.
        await initiateRefund(order._id);
      }

    } else {
      // 3. If payment is not confirmed, update order status to 'failed' and potentially call initiateRefund.
      order.status = "failed";
      await order.save();
      // Potentially initiate refund if payment was attempted but not confirmed on chain
      // await initiateRefund(order._id); // Decide if refund is needed in this case
    }

  } catch (error) {
    // 4. Use handleError from errorHandler.js in catch blocks
    handleError(error, `Processing airtime purchase for order ${order._id}`);
    order.status = "failed";
    await order.save(); // Save the failed status
    // Decide if refund is needed on general error
    // await initiateRefund(order._id);
  }

  return order;
}

async function handleDataOrder(data) {
  const order = await Order.create({ ...data, service: "data", status: "pending" });

  try {
     // 1. Call checkPaymentStatus from smartContractService.js to verify crypto payment status for the order.
    const paymentConfirmed = await checkPaymentStatus(order._id); // Assuming order._id is used as identifier

    if (paymentConfirmed) {
      // 2. If payment is confirmed:
      try {
         // a. Call the appropriate VTpass processing function
        const vtpassResponse = await processData(data);

        // b. Based on the VTpass response, update the order status in the database.
        if (vtpassResponse.success) {
          order.status = "success";
           // TODO: Store vtpassTxnId or other relevant info
        } else {
          order.status = "failed";
          // d. If VTpass transaction fails, call initiateRefund from smartContractService.js.
          await initiateRefund(order._id);
        }
        await order.save();

         // c. If VTpass transaction is successful, call releaseFunds from smartContractService.js.
        if (order.status === "success") {
          await releaseFunds(order._id);
        }

      } catch (vtpassError) {
         // Handle errors during VTpass interaction
        handleError(vtpassError, `VTpass processing for order ${order._id}`);
        order.status = "failed";
        await order.save();
        // d. If VTpass transaction fails, call initiateRefund from smartContractService.js.
        await initiateRefund(order._id);
      }

    } else {
       // 3. If payment is not confirmed, update order status to 'failed' and potentially call initiateRefund.
      order.status = "failed";
      await order.save();
       // Potentially initiate refund if payment was attempted but not confirmed on chain
      // await initiateRefund(order._id); // Decide if refund is needed in this case
    }

  } catch (error) {
     // 4. Use handleError from errorHandler.js in catch blocks
    handleError(error, `Processing data order for order ${order._id}`);
    order.status = "failed";
    await order.save(); // Save the failed status
     // Decide if refund is needed on general error
    // await initiateRefund(order._id);
  }


  return order;
}

async function processVTPassPurchase(data) {
  const order = await Order.create({ ...data, service: "tv", status: "pending" });

  try {
     // 1. Call checkPaymentStatus from smartContractService.js to verify crypto payment status for the order.
    const paymentConfirmed = await checkPaymentStatus(order._id); // Assuming order._id is used as identifier

    if (paymentConfirmed) {
      // 2. If payment is confirmed:
      try {
         // a. Call the appropriate VTpass processing function
        const vtpassResponse = await processTV(data);

        // b. Based on the VTpass response, update the order status in the database.
        if (vtpassResponse.success) {
          order.status = "success";
           // TODO: Store vtpassTxnId or other relevant info
        } else {
          order.status = "failed";
           // d. If VTpass transaction fails, call initiateRefund from smartContractService.js.
          await initiateRefund(order._id);
        }
        await order.save();

         // c. If VTpass transaction is successful, call releaseFunds from smartContractService.js.
        if (order.status === "success") {
          await releaseFunds(order._id);
        }

      } catch (vtpassError) {
         // Handle errors during VTpass interaction
        handleError(vtpassError, `VTpass processing for order ${order._id}`);
        order.status = "failed";
        await order.save();
         // d. If VTpass transaction fails, call initiateRefund from smartContractService.js.
        await initiateRefund(order._id);
      }

    } else {
       // 3. If payment is not confirmed, update order status to 'failed' and potentially call initiateRefund.
      order.status = "failed";
      await order.save();
      // Potentially initiate refund if payment was attempted but not confirmed on chain
      // await initiateRefund(order._id); // Decide if refund is needed in this case
    }


  } catch (error) {
    // 4. Use handleError from errorHandler.js in catch blocks
    handleError(error, `Processing TV purchase for order ${order._id}`);
    order.status = "failed";
    await order.save(); // Save the failed status
    // Decide if refund is needed on general error
    // await initiateRefund(order._id);
  }


  return order;
}

export { processAirtimePurchase, handleDataOrder, processVTPassPurchase };