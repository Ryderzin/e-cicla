package br.com.ecicla.api.device;

/** Optional details of a device (PB10). Every field may be null, when the user does not know it. */
public record DeviceDetails(BatteryType batteryType, Double screenSizeInches) {

    public boolean isEmpty() {
        return batteryType == null && screenSizeInches == null;
    }
}
