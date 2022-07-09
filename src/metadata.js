import * as R from 'ramda';
import {getResource, setBaseUrl, setEncoding} from './network';

export const getMetadataApi = (host, port) => {
  const baseUrl = `http://${host}:${port}`;
  const configureApi = R.pipe(
    setBaseUrl,
    setEncoding('json')
  );
  return configureApi(baseUrl);
};

export const loadMetadata = (apiConfig) => {
  return getResource({apiConfig, method: 'get', path: '/metadata'}, 10, 5);
};

export const loadSchemaByName = (apiConfig, name) => {
  return getResource({apiConfig, method: 'get', path: `/schemas/${name}`}, 10, 5);
};

const mapIndexed = R.addIndex(R.map);

const measureToField = R.curry( (sequenceAdvance, measure, idx) => {
  return {name: measure.name, dataType: 'int32', seq: (sequenceAdvance + idx + 1)};
} );

const timeMeasureStateToField = R.curry( (sequenceAdvance, measure, idx) => {
  const startTimeName = `${measure.state}StartTS`;
  return {name: startTimeName, dataType: 'string', seq: (sequenceAdvance + idx + 1)};
} );


export const addFieldsForMeasures = (processKV) => {
  const [name, process] = processKV;
  const {fields: rawFlds, measures} = process;
  let sequenceAdvance = R.last(rawFlds).seq;
  const measureFields = mapIndexed( measureToField(sequenceAdvance), measures );
  sequenceAdvance = R.last(measureFields).seq;
  const timestampFields = measures.filter(m => m.type === 'time')
    .map( timeMeasureStateToField(sequenceAdvance) );
  const fieldsWithMeasures = [...rawFlds, ...measureFields, ...timestampFields];
  const processWithMeasureFields = {...process, fields: fieldsWithMeasures};
  return [name, processWithMeasureFields];
};

