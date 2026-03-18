import sqlite3


class Database:

	def __init__( self ):

		self.Connection = sqlite3.connect( "grocery_app.db" )
		self.Cursor = self.Connection.cursor()

		self.createTables()


	# Function: createTables
	# param: none
	# return: none
	def createTables( self ):

		self.Cursor.execute(
		"""
		CREATE TABLE IF NOT EXISTS products
		(
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT,
			current_price REAL,
			highest_price REAL,
			lowest_price REAL,
			frequency INTEGER
		)
		"""
		)

		self.Cursor.execute(
		"""
		CREATE TABLE IF NOT EXISTS purchases
		(
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			date TEXT
		)
		"""
		)

		self.Cursor.execute(
		"""
		CREATE TABLE IF NOT EXISTS purchase_items
		(
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			purchase_id INTEGER,
			product_name TEXT,
			price REAL
		)
		"""
		)

		self.Connection.commit()


	# Function: addProduct
	# param: name, price
	# return: none
	def addProduct( self, Name, Price ):

		self.Cursor.execute(
		"""
		INSERT INTO products
		(name, current_price, highest_price, lowest_price, frequency)
		VALUES (?, ?, ?, ?, ?)
		""",
		(Name, Price, Price, Price, 1)
		)

		self.Connection.commit()


	# Function: getProducts
	# param: none
	# return: list
	def getProducts( self ):

		self.Cursor.execute("SELECT * FROM products")
		return self.Cursor.fetchall()