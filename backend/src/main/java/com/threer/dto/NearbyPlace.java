package com.threer.dto;

/**
 * A single recycling centre returned by the Google Places API.
 */
public class NearbyPlace {

    private String name;
    private String address;
    private double lat;
    private double lng;
    private String openNow;   // "Open now", "Closed", or "Unknown"
    private double rating;    // 0 if not available
    private String mapsUrl;   // deep-link to Google Maps

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public double getLat() { return lat; }
    public void setLat(double lat) { this.lat = lat; }

    public double getLng() { return lng; }
    public void setLng(double lng) { this.lng = lng; }

    public String getOpenNow() { return openNow; }
    public void setOpenNow(String openNow) { this.openNow = openNow; }

    public double getRating() { return rating; }
    public void setRating(double rating) { this.rating = rating; }

    public String getMapsUrl() { return mapsUrl; }
    public void setMapsUrl(String mapsUrl) { this.mapsUrl = mapsUrl; }
}
