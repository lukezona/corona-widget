// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: yellow; icon-glyph: file-medical-alt;

/**
 * Licence: Dipartimento della Protezione Civile (DPC), CC-BY-4.0
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * 
 * BASE VERSION FORKED FROM AUTHOR: rphl https://github.com/rphl/corona-widget
 * THIS VERSION (AUTHOR: https://github.com/lukezona) https://github.com/lukezona/corona-widget
 * 
 */

// ============= CONFIGURAZIONE =============

const CONFIG_OPEN_URL = "http://opendatadpc.maps.arcgis.com/apps/opsdashboard/index.html#/dae18c330e8e4093bb090ab0aa2b4892" // open DPC dashboard on tap, CONFIG_OPEN_URL=false to disable
const CONFIG_GRAPH_SHOW_DAYS = 14
const CONFIG_MAX_CACHED_DAYS = 14 // WARNING!!! Smaller values will delete saved days > CONFIG_MAX_CACHED_DAYS. Backup JSON first ;-)
const CONFIG_REFRESH_INTERVAL = 60 * 60 // interval the widget is update in (in seconds)
const CONFIG_SHOW_CASES_TREND_ARROW = true // show trend arrow for cases

// ============= ============= ============= ============= =================
// FERMO, STOP !!!
// MODIFICARE LE SEGUENTI RIGHE SOLO A PROPRIO RISCHIO E PERICOLO !!!
// ============= ============= ============= ============= =================
// PER LA CONFIGURAZIONE VEDERE README:
// https://github.com/lukezona/corona-widget/blob/master/README.md
// ============= ============= ============= ============= =================

const apiUrlNational = `https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-andamento-nazionale.json`;
const apiUrlNationalToday = `https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-andamento-nazionale-latest.json`;
const apiUrlRegional = `https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-regioni.json`;
const apiUrlRegionalToday = `https://raw.githubusercontent.com/pcm-dpc/COVID-19/master/dati-json/dpc-covid19-ita-regioni-latest.json`;

const LIMIT_DARKDARKRED = 250
const LIMIT_DARKRED = 100
const LIMIT_RED = 50
const LIMIT_ORANGE = 35
const LIMIT_YELLOW = 25
const LIMIT_DARKDARKRED_COLOR = new Color('941100')
const LIMIT_DARKRED_COLOR = new Color('c01a00')
const LIMIT_RED_COLOR = new Color('f92206')
const LIMIT_ORANGE_COLOR = new Color('faa31b')
const LIMIT_YELLOW_COLOR = new Color('f7dd31')
const LIMIT_GREEN_COLOR = new Color('00ff80')
const LIMIT_GRAY_COLOR = new Color('d0d0d0')
const CODICI_REGIONI = {
    'Abruzzo': 'AB',
    'Basilicata': 'BA',
    'Calabria': 'CL',
    'Emilia-Romagna': 'ER',
    'Friuli-Venezia Giulia': 'FV', 
    'Lazio': 'LA',
    'Liguria': 'LI',
    'Lombardia': 'LO',
    'Marche': 'MA',
    'Molise': 'MO',
    'Piemonte': 'PI',
    'Puglia': 'PU',
    'Sardegna': 'SA',
    'Sicilia': 'SI',
    'Toscana': 'TO',
    'Trentino-Alto Adige': 'TA',
    'Umbria': 'UM',
    'Valle d\'Aosta': 'VA',
    'Veneto': 'VE',
};

let MEDIUMWIDGET = (config.widgetFamily === 'medium') ? true : false

var fm = getFilemanager()
let fmConfigDirectory = fm.joinPath(fm.documentsDirectory(), '/coronaItalyWidget')
let data = {}

class IncidenceWidget {
    async init() {
        const widget = await this.createWidget()
        widget.setPadding(0,0,0,0)
        if (!config.runsInWidget) {
            if (MEDIUMWIDGET) {
                await widget.presentMedium()
            } else {
                await widget.presentSmall()
            }
        }
        Script.setWidget(widget)
        Script.complete()
    }
    async createWidget() {
        const list = new ListWidget()
        // const headerRow = addHeaderRowTo(list)
        // const dataResponse = await getData(0)
        const dataResponse = {};
        dataResponse.status = 200;
        dataResponse.data = [];
        if (dataResponse.status === 200 || dataResponse.status === 418) {
            let data = dataResponse.data
            // headerRow.addSpacer(3)
        
            let chartdata = getChartData(data, 'd')
            let chartDataTitle = getGetLastCasesAndTrend(data, 'd')
            // addChartBlockTo(headerRow, chartDataTitle, chartdata, false)
            // headerRow.addSpacer(0)
            // list.addSpacer(3)

            const incidenceRow = list.addStack()
            incidenceRow.layoutHorizontally()
            incidenceRow.centerAlignContent()
        
            let padding = (MEDIUMWIDGET) ? 5 : 10
            addBlockTo(incidenceRow, data, [0,10,0,padding], 0, dataResponse.status)
            if (CONFIG_OPEN_URL) list.url = CONFIG_OPEN_URL
            list.refreshAfterDate = new Date(Date.now() + CONFIG_REFRESH_INTERVAL * 1000)
        } else {
            // headerRow.addSpacer()
            // list.addSpacer()
            let errorBox = list.addStack()
            errorBox.setPadding(10, 10, 10, 10)
            addLabelTo(errorBox, "⚡️ Non è stato possibile caricare i dati. \nApri il widget per ricaricarli. \n\nCONSIGLIO: Puoi impostare un ID per la cache nella configurazione.", Font.mediumSystemFont(10), Color.gray())
        }
        return list
    }
}

function getGetLastCasesAndTrend(data, property) {
    // TODAY
    let casesTrendStr = '';
    let todayData = getDataForDate(data)
    let todayCases = todayData[property].dailyCases;
    let yesterdayCases = false
    let beforeYesterdayCases = false
    if (todayCases !== -1) {
        casesTrendStr = '+' + formatNumber(todayCases)
        // YESTERDAY
        let yesterdayData = getDataForDate(data, 1)
        if (yesterdayData) yesterdayCases = yesterdayData[property].dailyCases;
        // BEFOREYESTERDAY
        let beforeYesterdayData = getDataForDate(data, 2)
        if (beforeYesterdayData) beforeYesterdayCases = beforeYesterdayData[property].dailyCases;
        if (todayCases && yesterdayCases !== false && beforeYesterdayCases !== false) {
            casesTrendStr += getTrendUpArrow(todayCases - yesterdayCases, yesterdayCases - beforeYesterdayCases)
        }
    } else {
        casesTrendStr = 'n/v'
    }
    return casesTrendStr
}

function getChartData (data, property) {
    const allKeys = Object.keys(data).reverse()
    const chartdata = new Array(CONFIG_GRAPH_SHOW_DAYS).fill({ value: 0, incidence: 0 });
    allKeys.forEach((key, index) => {
        if (typeof chartdata[CONFIG_GRAPH_SHOW_DAYS - 1 - index] !== 'undefined') {
            chartdata[CONFIG_GRAPH_SHOW_DAYS - 1 - index] = {
                value: (data[key][property]['dailyCases']) ? data[key][property]['dailyCases'] : 0,
                incidence: data[key][property]['incidence']
            }
        }
    })
    return chartdata
}

function addIncidenceBlockTo(view, data, padding, useStaticCoordsIndex, status = 200) {
    const incidenceBlockBox = view.addStack()
    incidenceBlockBox.setPadding(padding[0], 0, padding[2], 0)
    incidenceBlockBox.layoutHorizontally()
    incidenceBlockBox.addSpacer(padding[1])
    
    const incidenceBlockRows = incidenceBlockBox.addStack()
    incidenceBlockRows.backgroundColor = new Color('cccccc', 0.1)
    incidenceBlockRows.setPadding(0,0,0,0)
    incidenceBlockRows.cornerRadius = 14
    incidenceBlockRows.layoutVertically()

    addIncidence(incidenceBlockRows, data, useStaticCoordsIndex, status)
    addTrendsBarToIncidenceBlock(incidenceBlockRows, data)
    incidenceBlockRows.addSpacer(2)
    incidenceBlockBox.addSpacer(padding[3])
    
    return incidenceBlockBox;
}

function addBlockTo(view, data, padding, useStaticCoordsIndex, status = 200) {
    const blockBox = view.addStack();
    blockBox.setPadding(padding[0], 0, padding[2], 0);
    blockBox.layoutHorizontally();
    blockBox.addSpacer(padding[1]);

    const blockRows = blockBox.addStack();
    blockRows.backgroundColor = new Color('cccccc', 0.1);
    blockRows.setPadding(0,0,0,0);
    blockRows.cornerRadius = 14;
    blockRows.layoutVertically();
}

function addIncidence(view, data, useStaticCoordsIndex = false, status = 200) {
    const todayData = getDataForDate(data)
    const yesterdayData = getDataForDate(data, 1)

    const incidenceBox = view.addStack()
    incidenceBox.setPadding(6,8,6,8)
    incidenceBox.cornerRadius = 12
    incidenceBox.backgroundColor = new Color('999999', 0.1)
    incidenceBox.layoutHorizontally()
    
    const stackMainRowBox = incidenceBox.addStack()
    stackMainRowBox.layoutVertically()
    stackMainRowBox.addSpacer(0)

    if (useStaticCoordsIndex === 0 && status === 200) {
        addLabelTo(stackMainRowBox, todayData.updated.substr(0, 10), Font.mediumSystemFont(10), new Color('888888'))
        stackMainRowBox.addSpacer(0)
    } else if (useStaticCoordsIndex === 0 && status === 418) {
        addLabelTo(stackMainRowBox, '⚡️ Modalità offline!', Font.mediumSystemFont(10), new Color('dbc43d'))
        stackMainRowBox.addSpacer(0)
    } else {
        stackMainRowBox.addSpacer(10)
    }
    const stackMainRow = stackMainRowBox.addStack()
    stackMainRow.centerAlignContent()

    // === INCIDENCE
    let incidence = formatNumber(todayData.area.incidence.toFixed(1), 1)
    if (todayData.area.incidence >= 100) incidence = formatNumber(Math.round(todayData.area.incidence))
    addLabelTo(stackMainRow, incidence, Font.boldSystemFont(27), getIncidenceColor(todayData.area.incidence))
    
    if (yesterdayData) {
        const incidenceTrend = getTrendArrow(todayData.area.incidence, yesterdayData.area.incidence);
        const incidenceLabelColor = (incidenceTrend === '↑') ? LIMIT_RED_COLOR : (incidenceTrend === '↓') ? LIMIT_GREEN_COLOR : new Color('999999')
        addLabelTo(stackMainRow, incidenceTrend, Font.boldSystemFont(27), incidenceLabelColor)
    }
    stackMainRow.addSpacer(4)

    // === BL INCIDENCE
    const incidenceBLStack = stackMainRow.addStack();
    incidenceBLStack.layoutVertically()
    incidenceBLStack.backgroundColor = new Color('dfdfdf')
    incidenceBLStack.cornerRadius = 4
    incidenceBLStack.setPadding(2,3,2,3)

    let incidenceBL = formatNumber(todayData.state.incidence.toFixed(1), 1);
    if (todayData.state.incidence >= 100) incidenceBL = formatNumber(Math.round(todayData.state.incidence))
    if (yesterdayData) {
        incidenceBL += getTrendArrow(todayData.state.incidence, yesterdayData.state.incidence)
    }
    addLabelTo(incidenceBLStack, incidenceBL, Font.mediumSystemFont(9), '444444')
    addLabelTo(incidenceBLStack, todayData.state.name, Font.mediumSystemFont(9), '444444')

    const areaNameStack = stackMainRowBox.addStack();
    areaNameStack.layoutHorizontally()
    areaNameStack.setPadding(0,0,0,0)
    areaNameStack.centerAlignContent()

    let areaIcon = getAreaIcon(todayData.area.areaIBZ)
    if (areaIcon && CONFIG_SHOW_AREA_ICON) {
        let areaNameIconBox = areaNameStack.addStack()
        areaNameIconBox.borderColor = new Color('999999', 0.3)
        areaNameIconBox.borderWidth = 2
        areaNameIconBox.cornerRadius = 2
        areaNameIconBox.setPadding(1,3,1,3)
        let areaIconLabel = areaNameIconBox.addText(areaIcon)
        areaIconLabel.font = Font.mediumSystemFont(9)
        areaNameStack.addSpacer(3)
    }

    let areaName = todayData.area.name
    if (typeof staticCoordinates[useStaticCoordsIndex] !== 'undefined' && staticCoordinates[useStaticCoordsIndex].name !== false) {
        areaName = staticCoordinates[useStaticCoordsIndex].name
    }
    areaName = areaName.toUpperCase().padEnd(50, ' ')
    const areanameLabel = addLabelTo(areaNameStack, areaName, Font.mediumSystemFont(14))
    areanameLabel.lineLimit = 1
    areaNameStack.addSpacer()
    stackMainRowBox.addSpacer(0)
}

function getAreaIcon(areaIBZ) {
    switch (areaIBZ) {
        case 40: // Kreisfreie Stadt
            return 'KS'
        case 41: // Stadtkreis
            return 'SK'
        case 42: // Kreis
        case 46: // Sonderverband offiziel Kreis
            return 'K'
        case 43: // Landkreis
        case 45: // Sonderverband offiziel Landkreis
            return 'LK'
    }
    return 'BZ' // Bezirk
}

function addLabelTo(view, text, font = false, textColor = false, minScale = 1.0) {
    const label = view.addText('' + text)
    label.minimumScaleFactor = minScale
    if (font) label.font = font
    if (textColor) label.textColor = (typeof textColor === 'string') ? new Color(textColor) : textColor;
    return label
}

function formatNumber(number, minimumFractionDigits = 0) {
    return new Number(number).toLocaleString('de-DE', { minimumFractionDigits: minimumFractionDigits })
}

function getTrendUpArrow(now, prev) {
    if(!CONFIG_SHOW_CASES_TREND_ARROW) return ''
    if(now < 0 && prev < 0) {
        now = Math.abs(now)
        prev = Math.abs(prev)
    }
    return (now < prev) ? '↗' : (now > prev) ? '↑' : '→'
}

function getTrendArrow(value1, value2) {
    return (value1 < value2) ? '↓' : (value1 > value2) ? '↑' : '→'
}

function addTrendsBarToIncidenceBlock(view, data) {
    const trendsBarBox = view.addStack()
    trendsBarBox.setPadding(3,8,3,8)
    trendsBarBox.layoutHorizontally()

    // AREA TREND
    let chartdata = getChartData(data, 'area')
    let chartDataTitle = getGetLastCasesAndTrend(data, 'area')
    /*DEMO!!!! chartdata = [{incidence: 0, value: 0},{incidence: 10, value: 10}{incidence: 20, value: 20},{incidence: 30, value: 30},{incidence: 40, value: 40},{incidence: 50, value: 50},{incidence: 70, value: 70},{incidence: 100, value: 100},{incidence: 60, value: 60},{incidence: 70, value: 70},{incidence: 39, value: 39},{incidence: 20, value: 25},{incidence: 10, value: 20},{incidence: 30, value: 30},]*/
    addChartBlockTo(trendsBarBox, chartDataTitle, chartdata, true)
    trendsBarBox.addSpacer()

    // STATE TREND
    let chartdataBL = getChartData(data, 'state')
    let chartDataBLTitle = getGetLastCasesAndTrend(data, 'state')
    /* DEMO!!!! chartdataBL = [{incidence: 0, value: 0},{incidence: 20, value: 20},{incidence: 40, value: 40},{incidence: 50, value: 50},{incidence: 70, value: 70},{incidence: 100, value: 100},{incidence: 110, value: 110},{incidence: 77, value: 77},{incidence: 70, value: 70},{incidence: 39, value: 39},{incidence: 30, value: 40},{incidence: 30, value: 30},{incidence: 40, value: 60},{incidence: 30, value: 20}]*/
    addChartBlockTo(trendsBarBox, chartDataBLTitle, chartdataBL, false)
}

function addHeaderRowTo(view) {
    const headerRow = view.addStack()
    headerRow.setPadding(8,8,4,8)
    headerRow.centerAlignContent()
    const headerIcon = headerRow.addText("🦠")
    headerIcon.font = Font.mediumSystemFont(16)
    return headerRow;
}

function addChartBlockTo(view, trendtitle, chartdata, alignLeft = true) {
    let block = view.addStack()
    block.setPadding(0,0,0,0)
    block.layoutVertically()
    block.size = new Size(58, 24)

    let textRow = block.addStack()
    if (!alignLeft) textRow.addSpacer()
    let chartText = textRow.addText(trendtitle)
    if (alignLeft) textRow.addSpacer()
    chartText.font = Font.mediumSystemFont(10)

    let graphImg = generateGraph(chartdata, 58, 10, alignLeft).getImage()
    let chartImg = block.addImage(graphImg)
    chartImg.resizable = false
}

function generateGraph(data, width, height, alignLeft = true) {
    let context = new DrawContext()
    context.size = new Size(width, height)
    context.opaque = false
    let max = Math.max.apply(Math, data.map(function(o) { return o.value; }))
    max = (max <= 0) ? 10 : max;
    let w = Math.round((width - (data.length * 2)) / data.length)
    let xOffset = (!alignLeft) ? (width - (data.length * (w + 1))) : 0
    data.forEach((item, index) => {
        let value = parseFloat(item.value)
        if (value === -1 && index == 0) value = 10;
        let h = Math.max(2, Math.round((Math.abs(value) / max) * height))
        let x = xOffset + (w + 1) * index
        let rect = new Rect(x, 0, w, h)
        context.setFillColor(getIncidenceColor((item.value >= 1) ? item.incidence : 0))
        context.fillRect(rect)
    })
    return context
}

async function getLocation(staticCoordinateIndex = false) {
    try {
        if (staticCoordinates && typeof staticCoordinates[staticCoordinateIndex] !== 'undefined' && Object.keys(staticCoordinates[staticCoordinateIndex]).length >= 3) {
            return staticCoordinates[staticCoordinateIndex]
        } else {
            Location.setAccuracyToThreeKilometers()
            return await Location.current()
        }
    } catch (e) {
        return null;
    }
}

async function getData(useStaticCoordsIndex = false) {
    let nazionali = {
        positivi: -1,
        ospedalizzati: -1,
        deceduti: -1,
    }

    try {
        let dataCases = await new Request(apiUrlNational).loadJSON();
        cases = dataCases.features[0].attributes.value
    } catch(e) { console.warn(e) }

    let rValue = 0
    try {
        rValue = await getRValue()
    } catch(e) { console.warn(e) }
  
    let cases = -1
    try {
        let dataCases = await new Request(apiUrlNewCases).loadJSON()
        cases = dataCases.features[0].attributes.value
    } catch(e) { console.warn(e) }

    try {
        // AREA DATA
        const location = await getLocation(useStaticCoordsIndex)
        let data = await new Request(apiUrl(location)).loadJSON()
        const attr = data.features[0].attributes

        // STATES DATA
        let dataStates = await new Request(apiUrlStates).loadJSON()
        const allStatesData = dataStates.features.map((f) => { return {
            BL: BUNDESLAENDER_SHORT[f.attributes.LAN_ew_GEN],
            incidence: f.attributes.cases7_bl_per_100k,
            cases: f.attributes.Fallzahl
        }})
        const statesData = getStateData(allStatesData, BUNDESLAENDER_SHORT[attr.BL])
        const averageIncidence = allStatesData.reduce((a, b) => a + b.incidence, 0) / allStatesData.length

        // FORMATTED DATA
        const res = {
            area: {
                incidence: parseFloat(attr.cases7_per_100k.toFixed(1)),
                name: attr.GEN,
                dailyCases: -1,
                areaCases: parseFloat(attr.cases.toFixed(1)),
                areaIBZ: attr.IBZ
            },
            state: {
                incidence: parseFloat(statesData.incidence.toFixed(1)),
                name: BUNDESLAENDER_SHORT[attr.BL],
                cases: statesData.cases,
                dailyCases: -1
            },
            d: {
                incidence: parseFloat(averageIncidence.toFixed(1)),
                dailyCases: cases,
                r: rValue
            },
            updated: attr.last_update,
            updatedTS: getTimestamp(attr.last_update),
            rs: attr.RS,
        }
        const preparedDataResponse = await prepareData(attr.RS, attr.GEN, res)
        if (preparedDataResponse.status === 200) saveData(attr.RS, preparedDataResponse.data)
        return preparedDataResponse
    } catch (e) {
        console.warn(e)
        if (typeof staticCoordinates[useStaticCoordsIndex] !== 'undefined' && staticCoordinates[useStaticCoordsIndex].cacheId) {
            console.warn('Begin loading from cache...' + staticCoordinates[useStaticCoordsIndex].cacheId)
            const loadedData = await loadData(staticCoordinates[useStaticCoordsIndex].cacheId)
            return new DataResponse(loadedData.data, 418)
        } else {
            console.warn('No cache id in "WidgetParameter" found. See readme.')
        }
    }
    return new DataResponse({}, 404)
}

async function prepareData(dataId, oldAreaName, newData) {
    await migrateDataFiles(dataId, oldAreaName)
    const dataResponse = await loadData(dataId)
    let data = {}
    if (dataResponse.status === 200) {
        const migratedData = migrateData(dataResponse.data)
        if (Object.keys(migratedData).length > 0) {
            data = migratedData;
        } else {
            data = dataResponse.data
        }
    }
    data[newData.updated.substr(0, 10)] = newData
    data = limitData(data)
    data = populateDailyCases(data);
    return new DataResponse(data)
}

function populateDailyCases(data) {
    const keys = Object.keys(data).reverse()
    keys.forEach((key) => {
        let yesterday = new Date(data[key].updatedTS - (60 * 60 * 24) * 1000)
        let yesterdayKey = `${(''+yesterday.getDate()).padStart(2, '0')}.${(''+(yesterday.getMonth() + 1)).padStart(2, '0')}.${yesterday.getFullYear()}`
        if (typeof data[yesterdayKey] !== 'undefined') {
            data[key].area.dailyCases = data[key].area.areaCases - data[yesterdayKey].area.areaCases
            data[key].state.dailyCases = data[key].state.cases - data[yesterdayKey].state.cases
        } else {
            if (data[key].area.dailyCases === null) data[key].area.dailyCases = -1
            if (data[key].state.dailyCases === null) data[key].state.dailyCases = -1
        }
    });
    return data
}

function limitData(data) {
    const dataKeys = Object.keys(data);
    const lastKeys = dataKeys.slice(Math.max(dataKeys.length - CONFIG_MAX_CACHED_DAYS, 0))
    let dataLimited = {}
    lastKeys.forEach(key => {
        dataLimited[key] = data[key]
    })
    return dataLimited
}

function migrateData(loggedData) {
    let migratedData = {}
    Object.keys(loggedData).forEach((key, index) => {
        // CHECK FOR OLD FORMAT
        if (typeof loggedData[key].incidence !== 'undefined') {
            const stateData = getStateData(loggedData[key].incidencePerState, loggedData[key].nameBL)
            migratedData[key] = {
                area: {
                    incidence: loggedData[key].incidence,
                    name: loggedData[key].areaName,
                    dailyCases: -1,
                    areaCases: loggedData[key].areaCases,
                },
                state: {
                    incidence: loggedData[key].incidenceBL,
                    name: loggedData[key].nameBL,
                    cases: stateData.cases,
                    dailyCases: -1
                },
                d: {
                    incidence: loggedData[key].averageIncidence,
                    dailyCases: loggedData[key].cases,
                    r: loggedData[key].r
                },
                updated: loggedData[key].updated,
                updatedTS: getTimestamp(loggedData[key].updated),
                rs: loggedData[key].RS,
            }
        }
    })
    return migratedData
}

function getTimestamp(dateStr) {
    const regex = /([\d]+)\.([\d]+)\.([\d]+),\ ([0-2]?[0-9]):([0-5][0-9])/g;
    let m = regex.exec(dateStr)
    return new Date(m[3], m[2]-1, m[1], m[4], m[5]).getTime()
}

function getStateData (incidencePerState, nameBL) {
    return incidencePerState.filter(item => {
        return item.BL === nameBL
    }).pop()
}

async function getRValue() {
    const rDataStr = await new Request(apiRUrl).loadString()
    const rData = parseRCSV(rDataStr) 
    let lastR = 0
    if (rData.length === 0) return lastR
    let availeRvalueField
    Object.keys(rData[0]).forEach(key => {
        CONFIG_CSV_RVALUE_FIELDS.forEach(possibleRKey => {
            if (key === possibleRKey) availeRvalueField = possibleRKey;
        })
    });
    let firstDatefield = Object.keys(rData[0])[0];
    if (availeRvalueField) {
        rData.forEach(item => {
            if (item[firstDatefield].includes('.') && typeof item[availeRvalueField] !== 'undefined' && parseFloat(item[availeRvalueField].replace(',','.')) > 0) {
                lastR = item;
            }
        })
    }
    return (lastR) ? parseFloat(lastR[availeRvalueField].replace(',','.')) : lastR
}

function getIncidenceColor(incidence) {
    let color = LIMIT_GREEN_COLOR
    if (incidence > LIMIT_DARKDARKRED) {
        color = LIMIT_DARKDARKRED_COLOR
    } else if (incidence >= LIMIT_DARKRED) {
        color = LIMIT_DARKRED_COLOR
    } else if (incidence >= LIMIT_RED) {
        color = LIMIT_RED_COLOR
    } else if (incidence >= LIMIT_ORANGE) {
        color = LIMIT_ORANGE_COLOR
    } else if (incidence >= LIMIT_YELLOW) {
        color = LIMIT_YELLOW_COLOR
    } else if (incidence === 0) {
        color = LIMIT_GRAY_COLOR
    }
    return color
}

function parseInput (input) {
    const _coords = []
    const _staticCoordinates = input.split(";").map(coords => {
        return coords.split(',')
    })
    _staticCoordinates.forEach(coords => {
        _coords[parseInt(coords[0])] = {
            index: parseInt(coords[0]),
            latitude: parseFloat(coords[1]),
            longitude: parseFloat(coords[2]),
            name: (coords[3]) ? coords[3] : false,
            cacheId: (coords[4]) ? coords[4] : false
        }
    })
    return _coords
}

function getDataForDate(data, dayOffset = 0) {
    const dateKeys = Object.keys(data)
    const dateKey = dateKeys[dateKeys.length - 1 - dayOffset]
    return  (typeof data[dateKey] !== 'undefined') ? data[dateKey] : false;
}

function saveData(dataId, newData) {
    let path = fm.joinPath(fmConfigDirectory, 'coronaWidget' + dataId + '.json')
    fm.writeString(path, JSON.stringify(newData))
}

function migrateDataFiles(dataId, oldAreaName) {
    if (!fm.isDirectory(fmConfigDirectory)) fm.createDirectory(fmConfigDirectory)
    let configPath = fm.joinPath(fmConfigDirectory, 'coronaWidget' + dataId + '.json')
    let oldConfigPaths = [
        fm.joinPath(fm.documentsDirectory(), 'covid19' + oldAreaName + '.json'),
        fm.joinPath(fm.documentsDirectory(), 'coronaWidget' + dataId + '.json')
    ]
    oldConfigPaths.forEach(oldPath => {
        if (fm.isFileStoredIniCloud(oldPath) && !fm.isFileDownloaded(oldPath)) fm.downloadFileFromiCloud(oldPath)
        if (fm.fileExists(oldPath) && !fm.fileExists(configPath)) try { fm.move(oldPath, configPath) } catch(e) { console.warn(e) }
        // if (fm.fileExists(oldPath)) try { fm.remove(oldPath) } catch(e) { console.warn(e) }
    })
}

async function loadData(dataId) {
    let path = fm.joinPath(fmConfigDirectory, 'coronaWidget' + dataId + '.json')
    if (fm.isFileStoredIniCloud(path) && !fm.isFileDownloaded(path)) {
        await fm.downloadFileFromiCloud(path)
    }
    if (fm.fileExists(path)) {
        try {
            return new DataResponse(JSON.parse(fm.readString(path)))
         } catch (e) {
             return new DataResponse(null, 500)
         }
    }
    return new DataResponse(null, 404)
}

function parseRCSV(rDataStr) {
    let lines = rDataStr.split(/(?:\r\n|\n)+/).filter(function(el) {return el.length != 0})
    let headers = lines.splice(0, 1)[0].split(";");
    let valuesRegExp = /(?:\"([^\"]*(?:\"\"[^\"]*)*)\")|([^\";]+)/g;
    let elements = []
    for (let i = 0; i < lines.length; i++) {
        let element = {};
        let j = 0;
        let values = lines[i].split(';')
        element = values.reduce(function(result, field, index) {
            result[headers[index]] = field;
            return result;
          }, {})
        elements.push(element)
    }
    return elements
}

function LOG(...data) {
    console.log(data.map(JSON.stringify).join(' | '))
}

class DataResponse {
    constructor(data, status = 200) {
        this.data = data
        this.status = status
    }
}

function getFilemanager() {
    try {
        fm = FileManager.iCloud()
    } catch (e) {
        fm = FileManager.local()
    }
    // check if user logged in iCloud
    try { 
        fm.documentsDirectory()
    } catch(e) {
        fm = FileManager.local()
    }
    return fm
}

await new IncidenceWidget().init()
