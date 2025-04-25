const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");
const { deserialize } = require("v8");

function storeOrderData(req, res, next) {
    const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;
    res.locals.orderData = { deliverTo, mobileNumber, status, dishes };
    next();
}

function list(req, res) {
    res.status(200).json({ data: orders });
}

function bodyDataHas(propertyName) {
    return function (req, res, next) {
        const { data = {} } = req.body;
        if (!data[propertyName] || data[propertyName] === "" ) {
            return next({
                status: 400,
                message: `Order must include a ${propertyName}`,
            })
        }
        next();
    }
}

function validateDish(req, res, next) {
    const { data: {dishes} = {} } = req.body;
    if (!Array.isArray(dishes) || dishes.length === 0){
        return next({
            status: 400,
            message: "Order must include at least one dish",
        });
    }
    next();
}

function validateQuantity(req, res, next) {
    const { data: {dishes} = {} } = req.body;
    for (let i = 0; i < dishes.length; i++) {
        const dishQuantity = dishes[i].quantity;
        if (!dishQuantity || dishQuantity <= 0 || !Number.isInteger(dishQuantity)) {
            return next({
                status: 400,
                message: `dish ${i} must have a quantity that is an integer greater than 0`,
            });
        }
    }
    next();
}

function create(req, res) {
    const newOrder = {
        id: nextId(),
        ...res.locals.orderData,
    };

    orders.push(newOrder);
    res.status(201).json({ data: newOrder });
}

function orderExist(req, res, next) {
    const { orderId } = req.params;
    const order = orders.find(o => o.id === orderId);

    if (!order) {
        return next({
            status: 404,
            message:  `Order id not found: ${orderId}`,
        });
    }
    res.locals.order = order;
    next();
}

function read(req, res) {
    res.status(200).json({ data: res.locals.order });
}

function update(req, res) {
    const order = res.locals.order;
    const { deliverTo, mobileNumber, status, dishes } = req.body.data;

    order.deliverTo = deliverTo;
    order.mobileNumber = mobileNumber;
    order.status = status;
    order.dishes = dishes;

    res.json({ data: order });
}

function validateId(req, res, next) {
    const { orderId } = req.params;
    const { data: { id } = {} } = req.body;
    if (!id) {
        return next();
    }

    if (orderId !== id) {
        return next({
            status: 400,
            message: `Order id does not match route id. Order: ${id}, Route: $${orderId}`,
        })
    }
    next();
}

function validateStatus(req, res, next) {
    const { data: { status } = {} } = req.body;
    const validStatuses = ["pending", "preparing", "out-for-delivery", "delivered"];
    if (!status || !validStatuses.includes(status)) {
        return next({
            status: 400,
            message: "Order must have a status of pending, preparing, out-for-delivery, delivered",
        });
    }
    next();
}

function deliveredStatus(req, res, next) {
    if (res.locals.order.status === "delivered") {
        return next({
            status: 400,
            message: "A delivered order cannot be changed",
        })
    }
    next();
}

function nonPendingOrder(req, res, next) {
    if (res.locals.order.status !== "pending") {
        next({
            status: 400,
            message: "An order cannot be deleted unless it is pending"
        });
    }
    next();
}

function destroy(req, res) {
    const { orderId } = req.params;
    const index = orders.findIndex(o => o.id === orderId);
    orders.splice(index, 1);
    res.sendStatus(204);
}

module.exports = {
    create: [
        bodyDataHas("deliverTo"),
        bodyDataHas("mobileNumber"),
        bodyDataHas("dishes"),
        validateDish,
        validateQuantity,
        storeOrderData,
        create,
    ],
    list,
    read: [orderExist, read],
    update: [
        orderExist,
        validateId,
        bodyDataHas("deliverTo"),
        bodyDataHas("mobileNumber"),
        bodyDataHas("dishes"),
        validateDish,
        validateQuantity,
        validateStatus,
        deliveredStatus,
        storeOrderData,
        update,
    ],
    delete: [orderExist, nonPendingOrder, destroy],
}