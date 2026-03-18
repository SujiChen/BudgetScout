import cv2
import pytesseract


class ScanClass:


	# Function: convertReceipt
	# param: ImagePath
	# return: extracted text
	def convertReceipt( self, ImagePath ):

		Image = cv2.imread( ImagePath)

		Text = pytesseract.image_to_string( Image )

		return Text


	# Function: validateReceipt
	# param: Text
	# return: boolean
	def validateReceipt( self, Text ):

		Text = Text.upper()

		if "TOTAL" in Text or "SUBTOTAL" in Text:
			return True

		return False


class CameraInput:


	# Function: takePhoto
	# param: none
	# return: saved image path
	def takePhoto( self ):

		Camera = cv2.VideoCapture(0)

		print("Press SPACE to capture receipt")

		while True:

			Result, Frame = Camera.read()

			cv2.imshow("Camera", Frame)

			Key = cv2.waitKey(1)

			if Key == 32:   # space bar

				FileName = "receipt.jpg"
				cv2.imwrite(FileName, Frame)

				break

		Camera.release()
		cv2.destroyAllWindows()

		return FileName


	# Function: verificationIndicator
	# param: IsValid
	# return: none
	def verificationIndicator( self, IsValid ):

		if IsValid:
			print("Receipt Verified")
		else:
			print("Receipt Not Verified")