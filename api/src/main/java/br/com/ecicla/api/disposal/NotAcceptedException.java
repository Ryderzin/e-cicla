package br.com.ecicla.api.disposal;

import java.util.List;

import br.com.ecicla.api.point.Material;

/** The chosen point does not say it accepts the device, and the user has not confirmed (PB11). */
public class NotAcceptedException extends RuntimeException {

    private final transient List<Material> accepted;

    public NotAcceptedException(List<Material> accepted) {
        super("The collection point does not accept this kind of device");
        this.accepted = accepted;
    }

    public List<Material> accepted() {
        return accepted;
    }
}
