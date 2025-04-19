const cds = require('@sap/cds/lib')
const { default: axios } = require('axios')
const { GET, POST, DELETE, PATCH } = cds.test(__dirname + '../../')

axios.defaults.auth = { username: 'incident.support@tester.sap.com', password: 'initial' }

jest.setTimeout(11111)

describe('Test The GET Endpoints', () => {
  it('Should check Processor Service', async () => {
    const processorService = await cds.connect.to('ProcessorService')
    const { Incidents } = processorService.entities
    expect(await SELECT.from(Incidents)).toHaveLength(4)
  })

  it('Should check Customers', async () => {
    const processorService = await cds.connect.to('ProcessorService')
    const { Customers } = processorService.entities
    expect(await SELECT.from(Customers)).toHaveLength(3)
  })

  it('Test Expand Entity Endpoint', async () => {
    const { data } = await GET`/odata/v4/processor/Customers?$select=firstName&$expand=incidents`
    expect(data).toEqual(expect.any(Object))
  })
})

describe('Draft Choreography APIs', () => {
  let draftId, incidentId

  it('Create an incident ', async () => {
    const { status, statusText, data } = await POST(`/odata/v4/processor/Incidents`, {
      title: 'Urgent attention required !',
      status_code: 'N'
    })
    draftId = data.ID
    expect(status).toEqual(201)
    expect(statusText).toEqual('Created')
  })

  it('+ Activate the draft & check Urgency code as H using custom logic', async () => {
    const response = await POST(
      `/odata/v4/processor/Incidents(ID=${draftId},IsActiveEntity=false)/ProcessorService.draftActivate`
    )
    expect(response.status).toEqual(201)
    expect(response.data.urgency_code).toEqual('H')
  })

  it('+ Test the incident status', async () => {
    const {
      status,
      data: { status_code, ID }
    } = await GET(`/odata/v4/processor/Incidents(ID=${draftId},IsActiveEntity=true)`)
    incidentId = ID
    expect(status).toEqual(200)
    expect(status_code).toEqual('N')
  })

  describe('Close Incident and Open it again to check Custom logic', () => {
    it(`Should Close the Incident-${draftId}`, async () => {
      const { status } = await POST(
        `/odata/v4/processor/Incidents(ID=${incidentId},IsActiveEntity=true)/ProcessorService.draftEdit`,
        {
          PreserveChanges: true
        }
      )
      expect(status).toEqual(201)
    })

    it(`Should Close the Incident-${draftId}`, async () => {
      const { status } = await PATCH(`/odata/v4/processor/Incidents(ID=${incidentId},IsActiveEntity=false)`, {
        status_code: 'C'
      })
      expect(status).toEqual(200)
    })
    it('+ Activate the draft & check Status code as C using custom logic', async () => {
      const response = await POST(
        `/odata/v4/processor/Incidents(ID=${incidentId},IsActiveEntity=false)/ProcessorService.draftActivate`
      )
      expect(response.status).toEqual(200)
    })

    it('+ Test the incident status to be closed', async () => {
      const {
        status,
        data: { status_code }
      } = await GET(`/odata/v4/processor/Incidents(ID=${incidentId},IsActiveEntity=true)`)
      expect(status).toEqual(200)
      expect(status_code).toEqual('C')
    })
    describe('should fail to re-open closed incident', () => {
      it(`Should Open Closed Incident-${draftId}`, async () => {
        const { status } = await POST(
          `/odata/v4/processor/Incidents(ID=${incidentId},IsActiveEntity=true)/ProcessorService.draftEdit`,
          {
            PreserveChanges: true
          }
        )
        expect(status).toEqual(201)
      })

      it(`Should re-open the Incident-${draftId} but fail`, async () => {
        const { status } = await PATCH(`/odata/v4/processor/Incidents(ID=${incidentId},IsActiveEntity=false)`, {
          status_code: 'N'
        })
        expect(status).toEqual(200)
      })
      it(' `Should fail to activate draft trying to re-open the incidentt', async () => {
        try {
          const response = await POST(
            `/odata/v4/processor/Incidents(ID=${incidentId},IsActiveEntity=false)/ProcessorService.draftActivate`
          )
        } catch (error) {
          expect(error.response.status).toEqual(500)
          expect(error.response.data.error.message).toContain(`Can't modify a closed incident`)
        }
      })
    })
  })

  it('- Delete the Draft', async () => {
    const response = await DELETE(`/odata/v4/processor/Incidents(ID=${draftId},IsActiveEntity=false)`)
    expect(response.status).toEqual(204)
  })

  it('- Delete the Incident', async () => {
    const response = await DELETE(`/odata/v4/processor/Incidents(ID=${draftId},IsActiveEntity=true)`)
    expect(response.status).toEqual(204)
  })
})
