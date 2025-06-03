using { sap.capire.incidents as my } from '../db/schema';

/**
 * Service used by administrators to manage customers and incidents.
 */
service AdminService
{
    annotate Customers with @restrict :
    [
        { grant : [ '*' ], to : [ 'admin' ] },
        { grant : [ '*' ], to : [ 'support' ] }
    ];

    annotate Incidents with @restrict :
    [
        { grant : [ '*' ], to : [ 'admin' ] },
        { grant : [ '*' ], to : [ 'support' ] }
    ];

    entity Customers as
        projection on my.Customers;

    entity Incidents as
        projection on my.Incidents;

}

annotate AdminService with @requires :
[
    'admin'
];

/**
 * Service used by support personell, i.e. the incidents' 'processors'.
 */
service ProcessorService
{
    annotate Customers with @restrict :
    [
        { grant : [ '*' ], to : [ 'support' ] }
    ];

    @odata.draft.enabled
    entity Incidents as
        projection on my.Incidents;

    @readonly
    entity Customers as
        projection on my.Customers;

}

annotate ProcessorService with @requires :
[
    'support'
];
