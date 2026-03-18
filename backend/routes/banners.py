"""
Version History:
v1.0 (2026-03-17) - homeDeals class

Functions expected by product class:
    getCooldown()
    getHighestPrice()
    getLowestPrice()
    getCurrentPrice()
    getName()
    getLocation()

To Do:
    
"""

class HomeDeals:
    visibleDeals = []
    pinnedDeals = []
    current = []

    def __init__(self, currFrequent):
        self.current = currFrequent

    def checkProductDeal(product):
        if product.getCurrentPrice() > (product.getHighestPrice() + product.getLowestPrice())/4:
            # amount of days = getCooldown()
            if product.getCooldown() > 7:
                # its a deal
                HomeDeals.visibleDeals.append(product)

    def updateDeals():
        for item in HomeDeals.current:
            HomeDeals.checkProductDeal(item)

    def pinItem(product):
        # when pin is pressed
        HomeDeals.pinnedDeals.append(product)

    def unpinItem(product):
        # find the product within the list and remove it
        HomeDeals.pinnedDeals.remove(product)

    def deleteDeal(product):
        # deletes from homepage
        HomeDeals.visibleDeals.remove(product)

    def display(product):
        # needs to display name, current price, percent off, average price, store location

        # add highest & lowest, divide by two to get average
        averagePrice = (product.getHighestPrice() + product.getLowestPrice())/2
        discount = (averagePrice - product.getCurrentPrice()) / averagePrice

        dealDetails = {
            "name" : product.getName(),
            "currentPrice" : product.getCurrentPrice(),
            "discount" : discount,
            "averagePrice" : averagePrice,
            "location" : product.getLocation()
        }
        return dealDetails

if __name__ == "__main__":
    #text
    pass