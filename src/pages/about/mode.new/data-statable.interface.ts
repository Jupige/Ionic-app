import { IDataStateProvider } from "./data-state.provider.interface";
import { IDataSate } from "./data-state.interface";
import { IDataRule } from "./data-rule.interface";

export interface IDataStatable {
    state: IDataSate;
    stateProvider: IDataStateProvider;
    rules?: IDataRule[]
}