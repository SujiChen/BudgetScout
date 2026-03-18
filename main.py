from database import Database

db = Database()

# add test products
db.addProduct("Milk", 3.99)
db.addProduct("Eggs", 2.49)
db.addProduct("Bread", 2.99)

# print database contents
products = db.getProducts()

for product in products:
    print(product)