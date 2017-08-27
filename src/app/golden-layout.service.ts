import * as GoldenLayout from 'golden-layout';
import { Type } from "@angular/core";
import { ItemConfigType, ContentItem } from "golden-layout";

export class GoldenLayoutService {
    layout: GoldenLayout;
    constructor() {

    }

    config(layoutName: string, defaultConfig: GoldenLayout.Config, container?: Element | HTMLElement | JQuery) {
        let preLayout = localStorage.getItem(layoutName);
        if (preLayout) {
            defaultConfig = JSON.parse(preLayout);
        }

        if (!defaultConfig.settings)
            defaultConfig.settings = {};

        defaultConfig.settings.selectionEnabled = true;
        this.layout = new GoldenLayout(defaultConfig, container);

        let that = this;
        ['initialised',
            'selectionChanged',
            'windowOpened',
            'windowClosed',
            'itemDestroyed',
            'itemCreated',
            'componentCreated',
            'rowCreated',
            'columnCreated',
            'stackCreated',

            'tabCreated'].forEach(en =>
                this.layout.on(en, (event) => {
                    console.log(`----------${en}----------------`);
                    console.log(event);
                }));

        this.layout.on('itemDestroyed', (event) => {
            if (!!event && !!event.instance) {
                if (typeof event.instance.ngOnDestroy === (typeof Function)) {
                    event.instance.ngOnDestroy();
                }
            }
        });

        this.layout.on('stateChanged', (event: any) => {
            if (!this.layout.isInitialised)
                return;

            localStorage.setItem(layoutName, JSON.stringify(that.layout.toConfig()));
        });
    }

    register(...componentPairs: { 'name': string; 'type': Type<any> }[]) {
        if (!this.layout)
            throw new Error('no layout');

        if (componentPairs && componentPairs.length > 0) {
            componentPairs.forEach(pair => {
                this.layout.registerComponent(pair.name, pair.type);
            })
        }
    }

    register2(...componentPairs: { 'name': string; 'constructor': any }[]) {
        if (!this.layout)
            throw new Error('no layout');

        if (componentPairs && componentPairs.length > 0) {
            componentPairs.forEach(pair => {
                this.layout.registerComponent(pair.name, pair.constructor);
            })
        }
    }

    init() {
        if (!this.layout)
            throw new Error('no layout');

        this.layout.init();
    }

    static overriedGoldenLayout() {
        let oldMethod = GoldenLayout.prototype.createContentItem;
        GoldenLayout.prototype.createContentItem = function (itemConfiguration?: GoldenLayout.ItemConfigType, parent?: GoldenLayout.ContentItem) {
            let conponentInstance = oldMethod.call(this, itemConfiguration, parent);
            console.log(conponentInstance);

            // if (!!conponentInstance && !!conponentInstance.instance) {
            //     if (typeof conponentInstance.instance.ngOnInit === (typeof Function)) {
            //         conponentInstance.instance.ngOnInit();
            //     }
            // }

            return conponentInstance;
        };
    }

    updateSize(width?: number, height?: number): void {
        this.layout.updateSize(width, height);
    }

    addItem(element: HTMLElement | JQuery, itemConfiguration: GoldenLayout.ItemConfigType): void {
        this.layout.createDragSource(element, itemConfiguration);
    }

    addChild(itemOrItemConfig: ContentItem | ItemConfigType, index?: number) {
        this.layout.root.contentItems[0].addChild(itemOrItemConfig, index);
    }
}