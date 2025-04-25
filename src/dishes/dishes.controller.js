const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

function storeDishData(req, res, next) {
    const { data: { name, description, price, image_url } = {} } = req.body;
    res.locals.newDish = { name, description, price, image_url };
    next();
}

function list(req, res) {
    res.json({ data: dishes });
}

function bodyDataHas(propertyName) {
    return function (req, res, next) {
        const { data = {} } = req.body;
        if (!data[propertyName]) {
            return next({
                status: 400,
                message: `Dish must include a ${propertyName}`,
            });
        }

        next();
    };
}

function checkValue(propertyName) {
    return function (req, res, next) {
        const { data = {} } = req.body;
        if (data[propertyName] === "") {
            return next({
                status: 400,
                message: `Dish must include a ${propertyName}`,
            })
        }
        next();
    }
}

function validatePrice(req, res, next) {
    const { data: {price} = {} } = req.body;
    if (price <= 0 || !Number.isInteger(price)) {
        return next({
            status: 400,
            message:"Dish must have a price that is an integer greater than 0",
        });
    }
    next();
}

function create(req, res) {
    const newDish = {
        id: nextId(),
        ...res.locals.newDish,
    };

    dishes.push(newDish);
    res.status(201).json({ data: newDish });
}

function dishExists(req, res, next) {
    const { dishId } = req.params;
    const dish = dishes.find(d => d.id === dishId);
    if (dish) {
        res.locals.dish = dish;
        return next();
    }
    next({
        status: 404,
        message: `Dish does not exist: ${dishId}`,
    })
}

function read(req, res) {
    res.status(200).json({ data: res.locals.dish });
}

function matchId(req, res, next) {
    const { dishId } = req.params;
    const { data: {id} = {} } = req.body;

    if (!id || id === dishId) {
        return next();
    }
    
    next({
        status: 400,
        message: `Dish id does not match route id. Dish: ${id}, Route: ${dishId}`,
    });
}

function update(req, res) {
    const dish = res.locals.dish;
    const { name, description, price, image_url } = req.body.data;
    dish.name = name;
    dish.description = description;
    dish.image_url = image_url;
    dish.price = price;

    res.json({ data: dish });
}

module.exports = {
    create: [
        bodyDataHas("name"),
        bodyDataHas("description"),
        bodyDataHas("price"),
        bodyDataHas("image_url"),
        checkValue("name"),
        checkValue("description"),
        checkValue("image_url"),
        validatePrice,
        storeDishData,
        create,
    ],
    list,
    read: [dishExists, read],
    update: [
        dishExists,
        matchId,
        bodyDataHas("name"),
        bodyDataHas("description"),
        bodyDataHas("price"),
        bodyDataHas("image_url"),
        checkValue("name"),
        checkValue("description"),
        checkValue("image_url"),
        validatePrice,
        storeDishData,
        update,
    ],
}