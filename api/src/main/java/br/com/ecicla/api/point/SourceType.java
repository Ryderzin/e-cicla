package br.com.ecicla.api.point;

/** Where a collection point came from. */
public enum SourceType {
    /** Imported from OpenStreetMap through the Overpass API. */
    OSM,
    /** Added by the team to the seed file, from public sources such as city hall websites. */
    MANUAL
}
