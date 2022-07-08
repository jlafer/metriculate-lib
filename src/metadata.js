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

export const addFieldsForMeasures = (processKV) => {
  const [name, process] = processKV;
  const {fields: rawFlds, measures} = process;
  const sequenceAdvance = R.last(rawFlds).seq;
  const measureFields = mapIndexed( measureToField(sequenceAdvance), measures );
  const fieldsWithMeasures = [...rawFlds, ...measureFields];
  const processWithMeasureFields = {...process, fields: fieldsWithMeasures};
  return [name, processWithMeasureFields];
};

